import type { User } from "../modelTypes.js";

export interface JWTPayload {
  id: number;
  username: string;
  email: string;
}

// Google Auth Types
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
  hd?: string; // Hosted domain (for G Suite accounts)
}

// Apple Auth Types
export interface AppleUserInfo {
  appleId: string;
  email: string;
  name?: string | undefined;
  emailVerified: boolean;
}

export interface AppleLoginRequest {
  idToken: string;
  authorizationCode?: string;
  user?: {
    name?: {
      firstName: string;
      lastName: string;
    };
    email: string;
  };
}

export interface AppleTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  nonce?: string;
  nonce_supported?: boolean;
  email: string;
  email_verified: boolean;
  is_private_email?: boolean;
  real_user_status?: number;
}

// Database User Types (extending your existing User type)
export interface SocialUser extends User {
  google_id?: string | null;
  apple_id?: string | null;
  social_provider?: "google" | "apple" | "email" | null;
}

// Auth Response Types
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

// Service Method Types
export interface AuthService {
  handleGoogleLogin(idToken: string): Promise<AuthResponse>;
  handleAppleLogin(data: AppleLoginRequest): Promise<AuthResponse>;
  findOrCreateSocialUser(
    provider: "google" | "apple",
    userData: GoogleUserInfo | AppleUserInfo,
  ): Promise<SocialUser>;
  linkSocialAccount(
    userId: number,
    provider: "google" | "apple",
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
  apple: {
    clientId: string;
    teamId: string;
    keyId: string;
    privateKey: string;
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
export type AppleTokenVerifier = TokenVerifier<AppleTokenPayload>;

declare global {
  namespace Express {
    interface Request {
      user?: SocialUser;
    }
  }
}
