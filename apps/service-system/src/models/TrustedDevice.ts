import type { ModelSchema } from "@soma-ms/shared";

export const TrustedDeviceSchema: ModelSchema = {
  tableName: "trusted_devices",
  columns: {
    id: "bigserial PRIMARY KEY",
    user_id: "bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE",
    device_fingerprint: "text NOT NULL",
    device_name: "text",
    trusted_until: "timestamp NOT  NULL",
    create_date: "timestamp NOT NULL DEFAULT NOW()",
    last_used: "timestamp NOT NULL DEFAULT NOW()",
  },
  indexes: [
    {
      name: "idx_trusted_devices_user_fingerprint",
      columns: ["user_id", "device_fingerprint"],
      unique: true,
    },
    {
      name: "idx_trusted_devices_trusted_until",
      columns: ["trusted_until"],
    },
  ],
};
