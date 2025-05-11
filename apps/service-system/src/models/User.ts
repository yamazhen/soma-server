import type { ModelSchema } from "@soma-ms/shared";

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  create_date: Date;
  update_date: Date;
  done_by: string;
}

export const UserSchema: ModelSchema = {
  tableName: "users",
  columns: {
    id: "bigserial PRIMARY KEY",
    username: "varchar(50) NOT NULL UNIQUE",
    email: "varchar(360) NOT NULL UNIQUE",
    password: "varchar(255) NOT NULL",
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
