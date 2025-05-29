import type { User } from "../modelTypes.js";
import type { Request } from "express";

export interface JWTPayload {
  id: number;
  username: string;
  email: string;
}

// google auth types
export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  picture: string;
  emailVerified: boolean;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash?: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: number;
  exp: number;
  jti?: string;
  hd?: string;
}

// extension of user model for social login
export interface SocialUser extends User {
  google_id?: string | null;
  /* can add more social login ids here like:
  apple_id?: string | null;
  facebook_id?: string | null;
  twitter_id?: string | null; */
}

// auth response types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
  };
  tokens: AuthTokens;
}

// service method types
export interface AuthService {
  handleGoogleLogin(idToken: string): Promise<AuthResponse>;
  findOrCreateSocialUser(
    provider: "google",
    userData: GoogleUserInfo,
  ): Promise<SocialUser>;
  linkSocialAccount(
    userId: number,
    provider: "google",
    socialId: string,
  ): Promise<void>;
}

// Express Request Extensions
declare global {
  namespace Express {
    interface Request {
      user?: SocialUser;
    }
  }
}

// OAuth Configuration Types
export interface OAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

// Token Verification Types
export interface TokenVerifier<T> {
  verify(token: string): Promise<T>;
}

export interface SocialUserWithIndex extends SocialUser {
  [key: string]: any;
}

export type GoogleTokenVerifier = TokenVerifier<GoogleTokenPayload>;

declare global {
  namespace Express {
    interface Request {
      user?: SocialUser;
    }
  }
}
