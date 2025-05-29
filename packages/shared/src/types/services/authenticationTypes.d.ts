import type { User } from "../modelTypes.js";
export interface JWTPayload {
    id: number;
    username: string;
    email: string;
}
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
export interface SocialUser extends User {
    google_id?: string | null;
}
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
export interface AuthService {
    handleGoogleLogin(idToken: string): Promise<AuthResponse>;
    findOrCreateSocialUser(provider: "google", userData: GoogleUserInfo): Promise<SocialUser>;
    linkSocialAccount(userId: number, provider: "google", socialId: string): Promise<void>;
}
declare global {
    namespace Express {
        interface Request {
            user?: SocialUser;
        }
    }
}
export interface OAuthConfig {
    google: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
}
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
//# sourceMappingURL=authenticationTypes.d.ts.map