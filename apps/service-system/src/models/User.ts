import type { ModelSchema } from "@soma-ms/shared";

export const UserSchema: ModelSchema = {
  tableName: "users",
  columns: {
    id: "bigserial PRIMARY KEY",
    username: "varchar(50) NOT NULL UNIQUE",
    email: "varchar(360) NOT NULL UNIQUE",
    password: "varchar(255)",
    profile_picture: "text",
    is_active: "boolean NOT NULL DEFAULT true",
    is_verified: "boolean NOT NULL DEFAULT false",
    verification_code: "varchar(6)",
    verification_code_expiry: "timestamp",
    google_id: "varchar(255)",
    apple_id: "varchar(255)",
    last_login: "timestamp",
    create_date: "timestamp NOT NULL DEFAULT NOW()",
    update_date: "timestamp NOT NULL DEFAULT NOW()",
    done_by: "varchar(50) NOT NULL DEFAULT 'SYS'",
  },
  indexes: [
    {
      name: "idx_users_email",
      columns: ["email"],
      unique: true,
    },
    {
      name: "idx_users_username",
      columns: ["username"],
    },
  ],
};
