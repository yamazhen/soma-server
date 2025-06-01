import {
  Database,
  InternalServerError,
  NotFoundError,
  serverEnv,
  UnauthorizedError,
  type AuthResponse,
  type GoogleUserInfo,
  type SocialUser,
} from "@soma-ms/shared";
import { OAuth2Client } from "google-auth-library";
import type { QueryResult } from "pg";
import {
  COMPLETE_LOGIN_QUERY,
  generateAccessToken,
  generateRefreshToken,
} from "../controllers/userController";
import { CacheService } from "./cacheService";

export class AuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(
      serverEnv.GOOGLE_CLIENT_ID,
      serverEnv.GOOGLE_CLIENT_SECRET,
      serverEnv.GOOGLE_REDIRECT_URI,
    );
  }

  async handleGoogleLogin(
    idToken: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    try {
      const googleUser = await this.verifyGoogleToken(idToken);
      const user = await this.findOrCreateSocialUser("google", googleUser);
      return this.generateAuthResponse(user, userAgent);
    } catch {
      throw new UnauthorizedError("INVALID_GOOGLE_TOKEN");
    }
  }

  private async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    const audience = serverEnv.GOOGLE_CLIENT_ID;
    if (!audience) {
      throw new Error("Google Client ID Is Not Set");
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

  // alot of functions heere are commented for future expansion
  private async findOrCreateSocialUser(
    provider: "google",
    userData: GoogleUserInfo,
  ): Promise<SocialUser> {
    const socialIdColumn = `${provider}_id`;
    const socialId = (userData as GoogleUserInfo).googleId;

    /* example for how to set up the socialId depending on the provider
    const socialId =
      provider === "google"
        ? (userData as GoogleUserInfo).googleId
        : (userData as AppleUserInfo).appleId; */

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
        !existingUser.google_id && existingUser.email === userData.email;
      /* example for how to check if the socialId needs linking depending on the provider
      const needsLinking =
        provider === "google"
          ? !existingUser.google_id && existingUser.email == userData.email
          : !existingUser.apple_id && existingUser.email == userData.email;
      */

      if (needsLinking) {
        await this.linkSocialAccount(existingUser.id, provider, socialId);

        /* example for how to set the socialId depending on the provider
        switch (provider) {
          case "google":
            existingUser.google_id = socialId;
            break;
          case "apple":
            existingUser.apple_id = socialId;
            break;
        } */
      }

      return existingUser as SocialUser;
    }

    const username = userData.name || userData.email.split("@")[0];
    const picture =
      provider === "google" ? (userData as GoogleUserInfo).picture : undefined;

    const createResult: QueryResult<SocialUser> = await Database.query(
      `INSERT INTO users (username, email, ${socialIdColumn}, is_verified, profile_picture) 
       VALUES ($1, $2, $3, true, $4) 
       RETURNING *`,
      [username, userData.email, socialId, picture],
    );

    const newUser = createResult.rows[0];
    if (!newUser) {
      throw new InternalServerError("Failed to create new user");
    }

    return newUser;
  }

  private async linkSocialAccount(
    userId: number,
    provider: "google",
    socialId: string,
  ): Promise<void> {
    const socialIdColumn = `${provider}_id`;
    await Database.query(
      `UPDATE users SET ${socialIdColumn} = $1 WHERE id = $2`,
      [socialId, userId],
    );
  }

  private async generateAuthResponse(
    user: SocialUser,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const accessToken = generateAccessToken(user.id, user.username, user.email);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await Database.query(COMPLETE_LOGIN_QUERY, [
      user.id,
      refreshToken,
      expiresAt,
      userAgent || "Social Login",
    ]);

    await CacheService.setRefreshTokenData(
      refreshToken,
      {
        user_id: user.id,
        username: user.username,
        email: user.email,
        expires_at: expiresAt,
        device_info: userAgent || "Social Login",
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
  }
}
