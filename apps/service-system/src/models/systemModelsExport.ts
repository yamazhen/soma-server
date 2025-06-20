import { OAuthStateSchema } from "./OAuthState.js";
import { RefreshTokenSchema } from "./RefreshToken.js";
import { TrustedDeviceSchema } from "./TrustedDevice.js";
import { UserSchema } from "./User.js";

export * from "./User.js";
export * from "./RefreshToken.js";
export * from "./OAuthState.js";
export * from "./TrustedDevice.js";

export const schemas = [
  UserSchema,
  RefreshTokenSchema,
  OAuthStateSchema,
  TrustedDeviceSchema,
];
