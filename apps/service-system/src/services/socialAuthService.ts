import {
  Database,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  type AppleLoginRequest,
  type AppleUserInfo,
  type AuthResponse,
  type GoogleUserInfo,
  type SocialUser,
} from "@soma-ms/shared";
import { OAuth2Client } from "google-auth-library";
import type { QueryResult } from "pg";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../controllers/userController.js";
import appleSignin from "apple-signin-auth";

export class SocialAuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
      process.env["GOOGLE_REDIRECT_URI"],
    );
  }

  async handleGoogleLogin(idToken: string): Promise<AuthResponse> {
    try {
      const googleUser = await this.verifyGoogleToken(idToken);
      const user = await this.findOrCreateSocialUser("google", googleUser);
      return this.generateAuthResponse(user);
    } catch (e) {
      throw new UnauthorizedError("Invalid google token");
    }
  }

  async handleAppleLogin(data: AppleLoginRequest): Promise<AuthResponse> {
    try {
      const appleUser = await this.verifyAppleToken(data.idToken);

      if (data.user?.name) {
        appleUser.name = `${data.user.name.firstName} ${data.user.name.lastName}`;
      }

      const user = await this.findOrCreateSocialUser("apple", appleUser);
      return this.generateAuthResponse(user);
    } catch (error) {
      throw new UnauthorizedError("Invalid apple token");
    }
  }

  private async verifyAppleToken(idToken: string): Promise<AppleUserInfo> {
    const payload = await appleSignin.verifyIdToken(idToken, {
      audience: process.env["APPLE_CLIENT_ID"]!,
      ignoreExpiration: false,
    });

    const emailVerified =
      payload.email_verified === true || payload.email_verified === "true";

    return {
      appleId: payload.sub,
      email: payload.email,
      emailVerified: emailVerified,
      name: undefined,
    };
  }

  private async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    const audience = process.env["GOOGLE_CLIENT_ID"];
    if (!audience) {
      throw new Error("Google client ID is not set");
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience,
    });

    const payload = ticket.getPayload();
    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      !payload.name ||
      !payload.picture ||
      typeof payload.email_verified !== "boolean"
    ) {
      throw new Error("Invalid token payload");
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified,
    };
  }

  private async findOrCreateSocialUser(
    provider: "google" | "apple",
    userData: GoogleUserInfo | AppleUserInfo,
  ): Promise<SocialUser> {
    const socialIdColumn = `${provider}_id`;
    const socialId =
      provider === "google"
        ? (userData as GoogleUserInfo).googleId
        : (userData as AppleUserInfo).appleId;

    const result: QueryResult<SocialUser> = await Database.query(
      `SELECT * FROM users WHERE email = $1 OR ${socialIdColumn} = $2`,
      [userData.email, socialId],
    );

    if (result.rows.length > 0) {
      const existingUser = result.rows[0];

      if (!existingUser) {
        throw new NotFoundError("User not found");
      }

      const needsLinking =
        provider === "google"
          ? !existingUser.google_id && existingUser.email == userData.email
          : !existingUser.apple_id && existingUser.email == userData.email;

      if (needsLinking) {
        await this.linkSocialAccount(existingUser.id, provider, socialId);

        if (provider === "google") {
          existingUser.google_id = socialId;
        } else {
          existingUser.apple_id = socialId;
        }
      }

      return existingUser as SocialUser;
    }

    const username = userData.name || userData.email.split("@")[0];
    const picture =
      provider === "google" ? (userData as GoogleUserInfo).picture : undefined;

    const createResult: QueryResult<SocialUser> = await Database.query(
      `INSERT INTO users (username, email, ${socialIdColumn}, is_verified, profile_picture, social_provider) 
       VALUES ($1, $2, $3, true, $4, $5) 
       RETURNING *`,
      [username, userData.email, socialId, picture, provider],
    );

    const newUser = createResult.rows[0];
    if (!newUser) {
      throw new InternalServerError("Failed to create new user");
    }

    return newUser;
  }

  private async linkSocialAccount(
    userId: number,
    provider: "google" | "apple",
    socialId: string,
  ): Promise<void> {
    const socialIdColumn = `${provider}_id`;
    await Database.query(
      `UPDATE users SET ${socialIdColumn} = $1, social_provider = $2 WHERE id = $3`,
      [socialId, provider, userId],
    );
  }

  private async generateAuthResponse(user: SocialUser): Promise<AuthResponse> {
    const accessToken = generateAccessToken(user.id, user.username, user.email);
    const refreshToken = await generateRefreshToken(user.id);

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
  }
}
