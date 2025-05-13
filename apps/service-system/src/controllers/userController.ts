import {
  BadRequestError,
  ConflictError,
  Database,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  type User,
  type UserDto,
} from "@soma-ms/shared";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import type { QueryResult } from "pg";
import { createVerificationEmailTemplate } from "../utils/emailTemplates.js";
import { emailService } from "../services/emailService.js";
import jwt from "jsonwebtoken";
import { TOKEN_CONSTANTS } from "../constants/tokenConstants.js";

const SALT_ROUNDS = 10;
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;

const CREATE_USER_QUERY = `
INSERT INTO users (username, email, password, verification_code, verification_code_expiry)
VALUES ($1, $2, $3, $4, $5) RETURNING username, email
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
    process.env["JWT_SECRET"]!,
    { expiresIn: TOKEN_CONSTANTS.ACCESS_TOKEN_EXPIRY },
  );
};

export const generateRefreshToken = async (userId: number) => {
  return jwt.sign(
    {
      id: userId,
      type: "refresh",
      tokenId: crypto.randomUUID(),
    },
    process.env["JWT_REFRESH_SECRET"]!,
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
  if (!username || !email || !password) {
    throw new BadRequestError("Username, email and password are required");
  }

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
      [username, email, hashedPassword, verificationCode, codeExpiry],
    );

    const user = result.rows[0];
    if (!user) {
      throw new InternalServerError("User creation failed");
    }
    newUser = user;
  } catch (e) {
    if (e instanceof Error && e.message.includes("unique constraint")) {
      throw new ConflictError(
        "User with this email or username already exists",
      );
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
    throw new InternalServerError(`Failed to send email to ${email}`);
  }
  return newUser;
};

export const findUserByUsername = async (username: string) => {
  try {
    if (!username) {
      throw new BadRequestError("Username is required");
    }
    const result: QueryResult<UserDto> = await Database.query(
      "SELECT username, email FROM users WHERE username = $1",
      [username],
    );

    const user = result.rows[0];
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  } catch (e) {
    throw e;
  }
};

export const verifyUser = async (req: { username: string; code: string }) => {
  try {
    const { username, code } = req;

    if (!username || !code) {
      throw new BadRequestError("Username and verification code are required");
    }

    const result: QueryResult<User> = await Database.query(
      "SELECT * FROM users WHERE username = $1",
      [username],
    );
    const user = result.rows[0] as User | undefined;

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.is_verified) {
      throw new NotFoundError("User is already verified");
    }

    if (user.verification_code !== code) {
      throw new NotFoundError("Invalid verification code");
    }

    if (!user.verification_code_expiry) {
      throw new NotFoundError("Verification code missing");
    }

    if (new Date() > new Date(user.verification_code_expiry)) {
      throw new NotFoundError("Verification code has expired");
    }

    const updateResult: QueryResult<UserDto> = await Database.query(
      "UPDATE users SET is_verified = true, verification_code = NULL, " +
        "verification_code_expiry = NULL where id = $1 " +
        "RETURNING username, email, is_verified",
      [user.id],
    );

    const verifiedUser = updateResult.rows[0];

    if (verifiedUser) {
      return verifiedUser;
    } else {
      throw new InternalServerError("Failed to verify user");
    }
  } catch (e) {
    throw e;
  }
};

export const loginUser = async (
  req: {
    username: string;
    password: string;
  },
  headers: { userAgent?: string | undefined },
) => {
  try {
    // for context username means either username or email
    const { username, password } = req;
    if (!username || !password) {
      throw new NotFoundError("Username and password are required");
    }

    const result: QueryResult<User> = await Database.query(
      "SELECT * FROM users WHERE username = $1 OR email = $1",
      [username],
    );
    const user = result.rows[0] as User | undefined;
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.is_verified) {
      throw new ForbiddenError(
        "User account is not verified. Please verify your email.",
      );
    }

    if (!user.is_active) {
      throw new ForbiddenError(
        "User account is disabled. Please contact support.",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid credentials");
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
      throw new UnauthorizedError("Refresh token is required");
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env["JWT_REFRESH_SECRET"]!);
    } catch (e) {
      throw new ForbiddenError("Invalid refresh token");
    }

    const tokenResult: QueryResult = await Database.query(
      "SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW()",
      [decoded.id, refreshToken],
    );

    if (tokenResult.rows.length === 0) {
      throw new ForbiddenError("Invalid or expired refresh token");
    }

    const userResult: QueryResult<UserDto> = await Database.query(
      "SELECT username, email FROM users WHERE id = $1",
      [decoded.id],
    );

    const user = userResult.rows[0];
    if (!user) {
      throw new NotFoundError("User not found");
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
      throw new BadRequestError("Refresh token is required");
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
