import {
  BadRequestError,
  buildUpdateQuery,
  CacheService,
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
  createLoginVerificationTemplate,
  createVerificationEmailTemplate,
} from "../utils/emailTemplates";
import { emailService } from "../services/emailService";
import jwt from "jsonwebtoken";
import { TOKEN_CONSTANTS } from "../constants/tokenConstants";

interface RefreshTokenWithUser extends RefreshToken {
  username: string;
  email: string;
}

// CONSTANTS
const SALT_ROUNDS = 10;
const TRUSTED_DEVICE_DURATION = 30;

// QUERIES
const CREATE_USER_QUERY = `
INSERT INTO users (username, email, password, display_name)
VALUES ($1, $2, $3, $4) RETURNING username, email, display_name
`;

const VERIFY_USER_QUERY = `
UPDATE users SET is_verified = true WHERE id = $1
RETURNING *
`;

const REFRESH_TOKEN_QUERY = `
SELECT rt.*, u.username, u.email FROM refresh_tokens rt 
JOIN users u ON rt.user_id = u.id 
WHERE rt.user_id = $1 AND rt.token = $2
`;

const DEVICE_TRUSTED_QUERY = `
SELECT * FROM trusted_devices
WHERE user_id = $1 AND device_fingerprint = $2 AND trusted_until > NOW()
`;

const UPDATE_TRUSTED_DEVICE_QUERY = `
UPDATE trusted_devices SET last_used = NOW()
WHERE user_id = $1 AND device_fingerprint = $2
`;

const ADD_TRUSTED_DEVICE_QUERY = `
INSERT INTO trusted_devices (user_id, device_fingerprint, device_name, trusted_until)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, device_fingerprint)
DO UPDATE SET trusted_until = $4, last_used = NOW()
`;

export const COMPLETE_LOGIN_QUERY = `
INSERT INTO refresh_tokens (user_id, token, expires_at, device_info)
VALUES ($1, $2, $3, $4)
`;

// HELPERS
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

export const generateLoginCode = () => {
  return randomInt(1000, 9999).toString();
};

const generateDeviceFingerprint = (userAgent: string, ip?: string) => {
  const baseString = `${userAgent}-${ip || "unknown"}`;
  return Buffer.from(baseString).toString("base64").slice(0, 50);
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

const isDeviceTrusted = async (userId: number, deviceFingerprint: string) => {
  const result: QueryResult = await Database.query(DEVICE_TRUSTED_QUERY, [
    userId,
    deviceFingerprint,
  ]);

  if (result.rows[0]) {
    await Database.query(UPDATE_TRUSTED_DEVICE_QUERY, [
      userId,
      deviceFingerprint,
    ]);
    return true;
  }
  return false;
};

const addTrustedDevice = async (
  userId: number,
  deviceFingerprint: string,
  deviceName?: string,
) => {
  const trustedUntil = new Date();
  trustedUntil.setDate(trustedUntil.getDate() + TRUSTED_DEVICE_DURATION);

  await Database.query(ADD_TRUSTED_DEVICE_QUERY, [
    userId,
    deviceFingerprint,
    deviceName,
    trustedUntil,
  ]);
};

// USER OPERATIONS
export const findAllUsers = async () => {
  const result: QueryResult<User> = await Database.query("SELECT * FROM users");
  return result.rows;
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

  const recentEmailSent = await CacheService.getRecentEmailSent(email);
  if (recentEmailSent) {
    throw new BadRequestError("EMAIL_ALREADY_SENT");
  }

  const emailCount = await CacheService.getEmailSendCount(email);
  if (emailCount >= 3) {
    throw new BadRequestError("EMAIL_RATE_LIMIT_EXCEEDED");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const verificationCode = generateVerificationCode();
  await CacheService.setVerificationCode(email, verificationCode);

  let newUser: UserDto;

  try {
    const result: QueryResult<UserDto> = await Database.query(
      CREATE_USER_QUERY,
      [username, email, hashedPassword, username],
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

    await CacheService.setRecentEmailSent(email, 60);
    await CacheService.incrementEmailSendCount(email, 3600);
  } catch {
    throw new InternalServerError("EMAIL_SENDING_FAILED");
  }
  return newUser;
};

const findUserByUsernameOrEmail = async (identifier: string) => {
  const result: QueryResult = await Database.query(
    "SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1",
    [identifier],
  );
  return result.rows[0] || null;
};

export const changeEmailByUsernameOrEmail = async (req: {
  newEmail: string;
  identifier: string;
}) => {
  const { identifier, newEmail } = req;
  if (!identifier || identifier === "") {
    throw new BadRequestError("USERNAME_OR_EMAIL_REQUIRED");
  }

  const recentEmailSent = await CacheService.getRecentEmailSent(newEmail);
  if (recentEmailSent) {
    throw new BadRequestError("EMAIL_ALREADY_SENT");
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
  await CacheService.setVerificationCode(newEmail, verificationCode);

  try {
    const emailContent = createEmailChangeVerificationTemplate(
      existingUser.username,
      verificationCode,
      newEmail,
    );
    emailService.sendEmail({ to: req.newEmail, ...emailContent });

    await CacheService.setRecentEmailSent(newEmail, 60);
  } catch {
    throw new InternalServerError("EMAIL_SENDING_FAILED");
  }
};

export const verifyEmailChange = async (req: {
  verificationCode: string;
  originalEmail: string;
  newEmail: string;
  username: string;
}) => {
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

  const cachedCode = await CacheService.getVerificationCode(newEmail);

  if (!cachedCode) {
    throw new BadRequestError("NO_VERIFICATION_CODE_FOUND");
  }

  if (verificationCode !== cachedCode) {
    throw new BadRequestError("INVALID_VERIFICATION_CODE");
  }

  await CacheService.deleteVerificationCode(newEmail);

  const updates: Record<string, any> = {
    email: newEmail,
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
};

export const updateUserProfileByUsername = async (
  username: string,
  req: {
    newDisplayName?: string;
    newProfilePicture?: string;
  },
) => {
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
  await CacheService.invalidateUser(existingUser);
  return user;
};

export const findUserById = async (userId: number) => {
  if (!userId) {
    throw new BadRequestError("User ID is required");
  }

  const cachedUser = await CacheService.getUser(userId);
  if (cachedUser) {
    return cachedUser;
  }

  const result: QueryResult<User> = await Database.query(
    "SELECT * FROM users WHERE id = $1",
    [userId],
  );

  const user = result.rows[0];
  if (!user) {
    throw new NotFoundError(`User with ID ${userId} not found`);
  }

  await CacheService.setUser(user);
  return user;
};

export const findUserByUsername = async (username: string) => {
  if (!username) {
    throw new BadRequestError("Username is required");
  }

  const cachedUser = await CacheService.getUserByUsername(username);
  if (cachedUser) {
    return cachedUser;
  }

  const result: QueryResult<User> = await Database.query(
    "SELECT * FROM users WHERE username = $1",
    [username],
  );

  const user = result.rows[0];
  if (!user) {
    throw new NotFoundError(`User with username ${username} not found`);
  }

  await CacheService.setUser(user);
  return user;
};

export const findUserByEmail = async (email: string) => {
  if (!email) {
    throw new BadRequestError("Email is required");
  }

  const cachedUser = await CacheService.getUserByEmail(email);
  if (cachedUser) {
    return cachedUser;
  }

  const result: QueryResult<User> = await Database.query(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );

  const user = result.rows[0];
  if (!user) {
    throw new NotFoundError(`User with email ${email} not found`);
  }

  await CacheService.setUser(user);
  return user;
};

export const verifyUser = async (
  req: { email: string; code: string },
  headers: { userAgent?: string | undefined },
) => {
  const { email, code } = req;

  if (!email || !code) {
    throw new BadRequestError("Email and verification code are required");
  }

  const verificationAttempts =
    await CacheService.getVerificationAttempts(email);
  if (verificationAttempts >= 5) {
    throw new ForbiddenError("TOO_MANY_VERIFICATION_ATTEMPTS");
  }

  const result: QueryResult<User> = await Database.query(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );
  const user = result.rows[0] as User | undefined;

  if (!user) {
    await CacheService.incrementVerificationAttempts(email);
    throw new NotFoundError("User not found");
  }

  if (user.is_verified) {
    throw new BadRequestError("User is already verified");
  }

  const cachedCode = await CacheService.getVerificationCode(email);

  if (!cachedCode) {
    await CacheService.incrementVerificationAttempts(email);
    throw new BadRequestError("NO_VERIFICATION_CODE_FOUND");
  }

  if (code !== cachedCode) {
    await CacheService.incrementVerificationAttempts(email);
    throw new BadRequestError("INVALID_VERIFICATION_CODE");
  }

  await CacheService.resetVerificationAttempts(email);
  await CacheService.deleteVerificationCode(email);

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
};

const loginWithoutPassword = async (user: User, userAgent: string) => {
  const accessToken = generateAccessToken(user.id, user.username, user.email);
  const refreshToken = generateRefreshToken(user.id);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Database.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at, device_info) " +
      "VALUES ($1, $2, $3, $4)",
    [user.id, refreshToken, expiresAt, userAgent || "Unknown Device"],
  );

  await CacheService.setRefreshTokenData(
    refreshToken,
    {
      user_id: user.id,
      username: user.username,
      email: user.email,
      expires_at: expiresAt,
      ...(userAgent && { device_info: userAgent }),
    },
    expiresAt,
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
};

export const initiateLogin = async (
  req: { usernameOrEmail: string; password: string },
  headers: { userAgent?: string; ip?: string },
) => {
  const { usernameOrEmail, password } = req;

  if (!usernameOrEmail || !!password) {
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

  const loginAttempts = await CacheService.getLoginAttempts(usernameOrEmail);
  if (loginAttempts >= 5) {
    throw new ForbiddenError("TOO_MANY_LOGIN_ATTEMPTS");
  }

  const result: QueryResult<User> = await Database.query(
    "SELECT * FROM users WHERE username = $1 OR email = $1",
    [usernameOrEmail],
  );

  const user = result.rows[0] as User | undefined;
  if (!user) {
    await CacheService.incrementLoginAttempts(usernameOrEmail);
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
    await CacheService.incrementLoginAttempts(usernameOrEmail);
    throw new UnauthorizedError("INVALID_PASSWORD");
  }

  const deviceFingerprint = generateDeviceFingerprint(
    headers.userAgent || "Unknown Device",
    headers.ip,
  );

  const deviceTrusted = await isDeviceTrusted(user.id, deviceFingerprint);
  if (deviceTrusted) {
    await CacheService.resetLoginAttempts(usernameOrEmail);
    return await completeLogin(user, headers.userAgent || "Unknown Device");
  }

  const loginCode = generateLoginCode();
  await CacheService.setLoginVerificationCode(user.email, loginCode);

  try {
    const emailContent = createLoginVerificationTemplate(
      user.username,
      loginCode,
    );

    await emailService.sendEmail({
      to: user.email,
      ...emailContent,
    });
  } catch {
    throw new InternalServerError("EMAIL_SENDING_FAILED");
  }

  await CacheService.setLoginSession(user.email, {
    userId: user.id,
    username: user.username,
    email: user.email,
    deviceFingerprint,
    userAgent: headers.userAgent || "Unknown Device",
  });

  return {
    requiresVerification: true,
    email: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
  };
};

export const verifyLogin = async (req: {
  email: string;
  verificationCode: string;
  trustDevice?: boolean;
}) => {
  const { email, verificationCode, trustDevice } = req;

  if (!email || !verificationCode) {
    throw new BadRequestError("EMAIL_AND_VERIFICATION_CODE_REQUIRED");
  }

  const loginSession = await CacheService.getLoginSession(email);
  if (!loginSession) {
    throw new BadRequestError("LOGIN_SESSION_EXPIRED");
  }

  const cachedCode = await CacheService.getLoginVerificationCode(email);
  if (!cachedCode || verificationCode !== cachedCode) {
    throw new BadRequestError("INVALID_VERIFICATION_CODE");
  }

  const user = await findUserById(loginSession.userId);
  if (!user) {
    throw new NotFoundError("USER_NOT_FOUND");
  }

  await CacheService.deleteLoginVerificationCode(email);
  await CacheService.deleteLoginSession(email);

  if (trustDevice) {
    await addTrustedDevice(
      user.id,
      loginSession.deviceFingerprint,
      loginSession.userAgent,
    );
  }

  await CacheService.resetLoginAttempts(email);

  return await completeLogin(user, loginSession.userAgent);
};

const completeLogin = async (user: User, userAgent: string) => {
  const accessToken = generateAccessToken(user.id, user.username, user.email);
  const refreshToken = generateRefreshToken(user.id);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Database.query(COMPLETE_LOGIN_QUERY, [
    user.id,
    refreshToken,
    expiresAt,
    userAgent,
  ]);

  await CacheService.setRefreshTokenData(
    refreshToken,
    {
      user_id: user.id,
      username: user.username,
      email: user.email,
      expires_at: expiresAt,
      device_info: userAgent,
    },
    expiresAt,
  );

  await Database.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
    user.id,
  ]);

  return {
    requiresVerification: false,
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
};

export const loginUser = async (
  req: {
    usernameOrEmail: string;
    password: string;
  },
  headers: { userAgent?: string | undefined },
) => {
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

  const loginAttempts = await CacheService.getLoginAttempts(usernameOrEmail);
  if (loginAttempts >= 5) {
    throw new ForbiddenError("TOO_MANY_LOGIN_ATTEMPTS");
  }

  const result: QueryResult<User> = await Database.query(
    "SELECT * FROM users WHERE username = $1 OR email = $1",
    [usernameOrEmail],
  );
  const user = result.rows[0] as User | undefined;
  if (!user) {
    await CacheService.incrementLoginAttempts(usernameOrEmail);
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
    await CacheService.incrementLoginAttempts(usernameOrEmail);
    throw new UnauthorizedError("INVALID_PASSWORD");
  }

  await CacheService.resetLoginAttempts(usernameOrEmail);

  const accessToken = generateAccessToken(user.id, user.username, user.email);
  const refreshToken = generateRefreshToken(user.id);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Database.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at, device_info) " +
      "VALUES ($1, $2, $3, $4)",
    [user.id, refreshToken, expiresAt, headers.userAgent || "Unknown Device"],
  );

  await CacheService.setRefreshTokenData(
    refreshToken,
    {
      user_id: user.id,
      username: user.username,
      email: user.email,
      expires_at: expiresAt,
      device_info: headers.userAgent || "Unknown Device",
    },
    expiresAt,
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
};

export const refreshAccessToken = async (req: { refreshToken: string }) => {
  const { refreshToken } = req;

  if (!refreshToken) {
    throw new UnauthorizedError("REFRESH_TOKEN_REQUIRED");
  }

  const cachedTokenData = await CacheService.getRefreshTokenData(refreshToken);
  if (cachedTokenData) {
    if (cachedTokenData.expires_at < new Date()) {
      throw new ForbiddenError("REFRESH_TOKEN_EXPIRED");
    }

    const newAccessToken = generateAccessToken(
      cachedTokenData.user_id,
      cachedTokenData.username,
      cachedTokenData.email,
    );

    return { accessToken: newAccessToken, expiresIn: 900 };
  }

  let decoded: any;
  try {
    decoded = jwt.verify(refreshToken, process.env["JWT_REFRESH_SECRET"]!);
  } catch {
    throw new ForbiddenError("INVALID_REFRESH_TOKEN");
  }

  const tokenResult: QueryResult<RefreshTokenWithUser> = await Database.query(
    REFRESH_TOKEN_QUERY,
    [decoded.id, refreshToken],
  );

  const token = tokenResult.rows[0];
  if (!token) {
    throw new ForbiddenError("INVALID_REFRESH_TOKEN");
  }

  if (token.expires_at < new Date()) {
    throw new ForbiddenError("REFRESH_TOKEN_EXPIRED");
  }

  await CacheService.setRefreshTokenData(
    refreshToken,
    {
      user_id: token.user_id,
      username: token.username,
      email: token.email,
      expires_at: token.expires_at,
      ...(token.device_info !== undefined && {
        device_info: token.device_info,
      }),
    },
    token.expires_at,
  );

  const newAccessToken = generateAccessToken(
    token.user_id,
    token.username,
    token.email,
  );

  return { accessToken: newAccessToken, expiresIn: 900 };
};

export const logoutUser = async (req: { refreshToken: string }) => {
  const { refreshToken } = req;
  if (!refreshToken) {
    throw new BadRequestError("REFRESH_TOKEN_REQUIRED");
  }

  await Database.query("DELETE FROM refresh_tokens WHERE token = $1", [
    refreshToken,
  ]);

  await CacheService.deleteRefreshTokenData(refreshToken);

  return { message: "LOGGED_OUT" };
};

// for future mobile app and web app
export const logoutAllDevices = async (req: {
  user: {
    id: number;
  };
}) => {
  const userId = (req as any).user.id;

  await Database.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
    userId,
  ]);

  return { message: "Logged out from all devices" };
};
