import {
	BadRequestError,
	buildUpdateQuery,
	ConflictError,
	Database,
	ForbiddenError,
	InternalServerError,
	NotFoundError,
	serverEnv,
	UnauthorizedError,
	updateFieldCheck,
	type RefreshToken,
	type User,
	type UserDto,
	type UserUpdateDto,
} from "@soma-ms/shared";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import type { QueryResult } from "pg";
import {
	createEmailChangeVerificationTemplate,
	createVerificationEmailTemplate,
} from "../utils/emailTemplates";
import { emailService } from "../services/emailService";
import jwt from "jsonwebtoken";
import { TOKEN_CONSTANTS } from "../constants/tokenConstants";

const SALT_ROUNDS = 10;
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;

const CREATE_USER_QUERY = `
INSERT INTO users (username, email, password,
verification_code, verification_code_expiry, display_name)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING username, email, display_name
`;
const VERIFY_USER_QUERY = `
UPDATE users SET is_verified = true, verification_code = NULL,
verification_code_expiry = NULL where id = $1
RETURNING *
`;

export const generateVerificationCode = () => {
	return randomInt(100000, 999999).toString();
};

export const generateAccessToken = (
	userId: number,
	username: string,
	email: string,
) => {
	return jwt.sign(
		{
			id: userId,
			username: username,
			email: email,
		},
		serverEnv.JWT_SECRET,
		{ expiresIn: TOKEN_CONSTANTS.ACCESS_TOKEN_EXPIRY },
	);
};

export const generateRefreshToken = (userId: number) => {
	return jwt.sign(
		{
			id: userId,
			type: "refresh",
			tokenId: crypto.randomUUID(),
		},
		serverEnv.JWT_REFRESH_SECRET,
		{ expiresIn: TOKEN_CONSTANTS.REFRESH_TOKEN_EXPIRY },
	);
};

export const findAllUsers = async () => {
	try {
		const result: QueryResult<User> = await Database.query(
			"SELECT * FROM users",
		);
		return result.rows;
	} catch (e) {
		throw e;
	}
};

export const createUser = async (req: {
	username: string;
	email: string;
	password: string;
}) => {
	const { username, email, password } = req;
	if (!username) throw new BadRequestError("USERNAME_REQUIRED");
	if (!email) throw new BadRequestError("EMAIL_REQUIRED");
	if (!password) throw new BadRequestError("PASSWORD_REQUIRED");

	const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
	const verificationCode = generateVerificationCode();
	const codeExpiry = new Date();
	codeExpiry.setMinutes(
		codeExpiry.getMinutes() + VERIFICATION_CODE_EXPIRY_MINUTES,
	);

	let newUser: UserDto;

	try {
		const result: QueryResult<UserDto> = await Database.query(
			CREATE_USER_QUERY,
			[username, email, hashedPassword, verificationCode, codeExpiry, username],
		);

		const user = result.rows[0];
		if (!user) {
			throw new InternalServerError("USER_CREATION_FAILED");
		}
		newUser = user;
	} catch (e) {
		if (e instanceof Error && e.message.includes("unique constraint")) {
			throw new ConflictError("USERNAME_OR_EMAIL_ALREADY_EXISTS");
		}
		throw e;
	}

	try {
		const emailContent = createVerificationEmailTemplate(
			username,
			verificationCode,
		);

		await emailService.sendEmail({
			to: email,
			...emailContent,
		});
	} catch (e) {
		throw new InternalServerError("EMAIL_SENDING_FAILED");
	}
	return newUser;
};

const findUserByUsernameOrEmail = async (identifier: string) => {
	try {
		const result: QueryResult = await Database.query(
			"SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1",
			[identifier],
		);
		return result.rows[0] || null;
	} catch (error) {
		throw error;
	}
};

export const changeEmailByUsernameOrEmail = async (req: {
	newEmail: string;
	identifier: string;
}) => {
	try {
		const { identifier, newEmail } = req;
		if (!identifier || identifier === "") {
			throw new BadRequestError("USERNAME_OR_EMAIL_REQUIRED");
		}

		const existingUser = await findUserByUsernameOrEmail(identifier);
		if (!existingUser) {
			throw new NotFoundError("USER_NOT_FOUND");
		}

		const emailInUse = await findUserByEmail(newEmail);
		if (emailInUse && emailInUse.id !== existingUser.id) {
			throw new BadRequestError("EMAIL_ALREADY_IN_USE");
		}

		const verificationCode = generateVerificationCode();
		const codeExpiry = new Date();
		codeExpiry.setMinutes(
			codeExpiry.getMinutes() + VERIFICATION_CODE_EXPIRY_MINUTES,
		);

		const setVerificationResult: QueryResult = await Database.query(
			"UPDATE users SET verification_code = $1, verification_code_expiry = $2 " +
				"WHERE username = $3 OR email = $3 RETURNING *",
			[verificationCode, codeExpiry, identifier],
		);

		const setVerificationSuccess = setVerificationResult.rows[0];
		if (!setVerificationSuccess) {
			throw new InternalServerError("VERIFICATION_CODE_FAILED");
		}

		try {
			const emailContent = createEmailChangeVerificationTemplate(
				existingUser.username,
				verificationCode,
				newEmail,
			);
			emailService.sendEmail({ to: req.newEmail, ...emailContent });
		} catch (e) {
			throw new InternalServerError("EMAIL_SENDING_FAILED");
		}
	} catch (e) {
		throw e;
	}
};

export const verifyEmailChange = async (req: {
	verificationCode: string;
	originalEmail: string;
	newEmail: string;
	username: string;
}) => {
	try {
		const { verificationCode, originalEmail, newEmail, username } = req;
		if (!newEmail || !verificationCode) {
			throw new BadRequestError("Email and verification code is required");
		}

		let existingUser: User | null = null;
		if (username && originalEmail) {
			const [userByUsername, userByEmail] = await Promise.all([
				findUserByUsername(username),
				findUserByEmail(originalEmail),
			]);
			existingUser = userByUsername || userByEmail;
		} else if (username) {
			existingUser = await findUserByUsername(username);
		} else if (originalEmail) {
			existingUser = await findUserByEmail(originalEmail);
		}

		if (!existingUser) {
			throw new NotFoundError("User not found");
		}

		if (
			!existingUser.verification_code_expiry ||
			!existingUser.verification_code
		) {
			throw new BadRequestError("No verification code found");
		}

		if (new Date() > new Date(existingUser.verification_code_expiry)) {
			throw new BadRequestError("Verification code has expired");
		}

		if (verificationCode !== existingUser.verification_code) {
			throw new BadRequestError("Invalid verification code");
		}

		const updates: Record<string, any> = {
			email: newEmail,
			verification_code: null,
			verification_code_expiry: null,
			done_by: existingUser.username,
			update_date: "NOW()",
		};

		const { query, values } = buildUpdateQuery(
			"users",
			updates,
			{ id: existingUser.id },
			{ returning: true, sqlFunctions: ["update_date"] },
		);

		const result: QueryResult = await Database.query(query, values);
		const user = result.rows[0];
		if (!user) {
			throw new InternalServerError("Failed to update user's email");
		}

		return user;
	} catch (e) {
		throw e;
	}
};

export const updateUserProfileByUsername = async (
	username: string,
	req: {
		newDisplayName?: string;
		newProfilePicture?: string;
	},
) => {
	try {
		if (!username) {
			throw new BadRequestError("Username is required");
		}

		const existingUser = await findUserByUsername(username);
		if (!existingUser) {
			throw new NotFoundError("User not found");
		}

		const updates: Record<string, any> = {};

		if (req.newDisplayName !== undefined)
			updates["display_name"] = req.newDisplayName;
		if (req.newProfilePicture !== undefined)
			updates["profile_picture"] = req.newProfilePicture;

		updateFieldCheck(updates);

		updates["done_by"] = username;
		updates["update_date"] = "NOW()";

		const fieldsToReturn = ["id", "email", "profile_picture", "display_name"];

		const { query, values } = buildUpdateQuery(
			"users",
			updates,
			{ username },
			{
				returning: fieldsToReturn,
				sqlFunctions: ["update_date"],
			},
		);

		const result: QueryResult<UserUpdateDto> = await Database.query(
			query,
			values,
		);

		const user = result.rows[0];
		if (!user) {
			throw new InternalServerError("User update failed");
		}
		return user;
	} catch (e) {
		throw e;
	}
};

export const findUserById = async (userId: number) => {
	try {
		if (!userId) {
			throw new BadRequestError("User ID is required");
		}

		const result: QueryResult<User> = await Database.query(
			"SELECT * FROM users WHERE id = $1",
			[userId],
		);

		const user = result.rows[0];
		if (!user) {
			throw new NotFoundError(`User with ID ${userId} not found`);
		}
		return user;
	} catch (e) {
		throw e;
	}
};

export const findUserByUsername = async (username: string) => {
	try {
		if (!username) {
			throw new BadRequestError("Username is required");
		}

		const result: QueryResult<User> = await Database.query(
			"SELECT * FROM users WHERE username = $1",
			[username],
		);

		const user = result.rows[0];
		if (!user) {
			throw new NotFoundError(`User with username ${username} not found`);
		}

		return user;
	} catch (e) {
		throw e;
	}
};

export const findUserByEmail = async (email: string) => {
	try {
		if (!email) {
			throw new BadRequestError("Email is required");
		}

		const result: QueryResult<User> = await Database.query(
			"SELECT * FROM users WHERE email = $1",
			[email],
		);

		const user = result.rows[0];
		if (!user) {
			throw new NotFoundError(`User with email ${email} not found`);
		}
		return user;
	} catch (e) {
		throw e;
	}
};

export const verifyUser = async (
	req: { email: string; code: string },
	headers: { userAgent?: string | undefined },
) => {
	try {
		const { email, code } = req;

		if (!email || !code) {
			throw new BadRequestError("Email and verification code are required");
		}

		const result: QueryResult<User> = await Database.query(
			"SELECT * FROM users WHERE email = $1",
			[email],
		);
		const user = result.rows[0] as User | undefined;

		if (!user) {
			throw new NotFoundError("User not found");
		}

		if (user.is_verified) {
			throw new BadRequestError("User is already verified");
		}

		if (user.verification_code !== code) {
			throw new BadRequestError("Invalid verification code");
		}

		if (!user.verification_code_expiry) {
			throw new BadRequestError("Verification code missing");
		}

		if (new Date() > new Date(user.verification_code_expiry)) {
			throw new BadRequestError("Verification code has expired");
		}

		const updateResult: QueryResult<User> = await Database.query(
			VERIFY_USER_QUERY,
			[user.id],
		);

		const verifiedUser = updateResult.rows[0];

		if (verifiedUser) {
			const loggedInUser = await loginWithoutPassword(
				verifiedUser,
				headers.userAgent || "Unknown Device",
			);

			return loggedInUser;
		} else {
			throw new InternalServerError("Failed to verify user");
		}
	} catch (e) {
		throw e;
	}
};

const loginWithoutPassword = async (user: User, userAgent: string) => {
	try {
		const accessToken = generateAccessToken(user.id, user.username, user.email);
		const refreshToken = generateRefreshToken(user.id);
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await Database.query(
			"INSERT INTO refresh_tokens (user_id, token, expires_at, device_info) " +
				"VALUES ($1, $2, $3, $4)",
			[user.id, refreshToken, expiresAt, userAgent || "Unknown Device"],
		);

		await Database.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
			user.id,
		]);

		return {
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				display_name: user.display_name,
				profile_picture: user.profile_picture,
				last_login: user.last_login,
			},
			tokens: {
				accessToken,
				refreshToken,
				expiresIn: 900,
			},
		};
	} catch (error) {
		throw error;
	}
};

export const loginUser = async (
	req: {
		usernameOrEmail: string;
		password: string;
	},
	headers: { userAgent?: string | undefined },
) => {
	try {
		const { usernameOrEmail, password } = req;

		if (!usernameOrEmail || !password) {
			if (!usernameOrEmail && !password) {
				throw new BadRequestError("USERNAME_OR_EMAIL_AND_PASSWORD_REQUIRED");
			}
			if (!usernameOrEmail) {
				throw new BadRequestError("USERNAME_OR_EMAIL_REQUIRED");
			}
			if (!password) {
				throw new BadRequestError("PASSWORD_REQUIRED");
			}
		}

		const result: QueryResult<User> = await Database.query(
			"SELECT * FROM users WHERE username = $1 OR email = $1",
			[usernameOrEmail],
		);
		const user = result.rows[0] as User | undefined;
		if (!user) {
			throw new UnauthorizedError("INVALID_USERNAME_OR_EMAIL");
		}

		if (!user.is_verified) {
			throw new ForbiddenError("VERIFY");
		}

		if (!user.is_active) {
			throw new ForbiddenError("DISABLED");
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			throw new UnauthorizedError("INVALID_PASSWORD");
		}

		const accessToken = generateAccessToken(user.id, user.username, user.email);
		const refreshToken = generateRefreshToken(user.id);
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await Database.query(
			"INSERT INTO refresh_tokens (user_id, token, expires_at, device_info) " +
				"VALUES ($1, $2, $3, $4)",
			[user.id, refreshToken, expiresAt, headers.userAgent || "Unknown Device"],
		);

		await Database.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
			user.id,
		]);

		return {
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				display_name: user.display_name,
				profile_picture: user.profile_picture,
				last_login: user.last_login,
			},
			tokens: {
				accessToken,
				refreshToken,
				expiresIn: 900,
			},
		};
	} catch (e) {
		throw e;
	}
};

export const refreshAccessToken = async (req: { refreshToken: string }) => {
	try {
		const { refreshToken } = req;

		if (!refreshToken) {
			throw new UnauthorizedError("REFRESH_TOKEN_REQUIRED");
		}

		let decoded: any;
		try {
			decoded = jwt.verify(refreshToken, process.env["JWT_REFRESH_SECRET"]!);
		} catch (e) {
			throw new ForbiddenError("INVALID_REFRESH_TOKEN");
		}

		const tokenResult: QueryResult<RefreshToken> = await Database.query(
			"SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2",
			[decoded.id, refreshToken],
		);

		const token = tokenResult.rows[0];
		if (!token) {
			throw new ForbiddenError("INVALID_REFRESH_TOKEN");
		}

		if (token.expires_at < new Date()) {
			throw new ForbiddenError("REFRESH_TOKEN_EXPIRED");
		}

		const userResult: QueryResult<UserDto> = await Database.query(
			"SELECT username, email FROM users WHERE id = $1",
			[decoded.id],
		);

		const user = userResult.rows[0];
		if (!user) {
			throw new NotFoundError("USER_NOT_FOUND");
		}

		const newAccessToken = generateAccessToken(
			decoded.id,
			user.username,
			user.email,
		);

		return { accessToken: newAccessToken, expiresIn: 900 };
	} catch (e) {
		throw e;
	}
};

export const logoutUser = async (req: { refreshToken: string }) => {
	try {
		const { refreshToken } = req;
		if (!refreshToken) {
			throw new BadRequestError("REFRESH_TOKEN_REQUIRED");
		}

		await Database.query("DELETE FROM refresh_tokens WHERE token = $1", [
			refreshToken,
		]);

		return { message: "Logged out successfully" };
	} catch (e) {
		throw e;
	}
};

// for future mobile app and web app
export const logoutAllDevices = async (req: {
	user: {
		id: number;
	};
}) => {
	try {
		const userId = (req as any).user.id;

		await Database.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
			userId,
		]);

		return { message: "Logged out from all devices" };
	} catch (e) {
		throw e;
	}
};
