import { OAuthStateSchema } from "./OAuthState";
import { RefreshTokenSchema } from "./RefreshToken";
import { TrustedDeviceSchema } from "./TrustedDevice";
import { UserSchema } from "./User";

export * from "./User";
export * from "./RefreshToken";
export * from "./OAuthState";
export * from "./TrustedDevice";

export const schemas = [
  UserSchema,
  RefreshTokenSchema,
  OAuthStateSchema,
  TrustedDeviceSchema,
];
