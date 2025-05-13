import { RefreshTokenSchema } from "./RefreshToken.js";
import { UserSchema } from "./User.js";

export * from "./User.js";
export * from "./RefreshToken.js";

export const schemas = [UserSchema, RefreshTokenSchema];
