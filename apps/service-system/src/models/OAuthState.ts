import type { ModelSchema } from "@soma-ms/shared";

export const OAuthStateSchema: ModelSchema = {
	tableName: "oauth_states",
	columns: {
		state_token: "varchar(255) PRIMARY KEY",
		data: "jsonb NOT NULL",
		expires_at: "timestamp with time zone NOT NULL",
		create_date: "timestamp NOT NULL DEFAULT NOW()",
	},
	indexes: [
		{
			name: "idx_oauth_states_expires_at",
			columns: ["expires_at"],
		},
	],
};
