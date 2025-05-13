import type { ModelSchema } from "@soma-ms/shared";

export const RefreshTokenSchema: ModelSchema = {
  tableName: "refresh_tokens",
  columns: {
    id: "bigserial PRIMARY KEY",
    user_id: "bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    token: "text UNIQUE NOT NULL",
    expires_at: "timestamp NOT NULL",
    device_info: "text",
    create_date: "timestamp NOT NULL DEFAULT NOW()",
  },
  indexes: [
    {
      name: "idx_refresh_tokens_user_id",
      columns: ["user_id"],
    },
    {
      name: "idx_refresh_tokens_token",
      columns: ["token"],
    },
  ],
};
