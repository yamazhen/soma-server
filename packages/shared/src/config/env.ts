import crypto from "node:crypto";

function getEnv(key: string, fallback = ""): string {
	return process.env[key] ?? fallback;
}

export const serverEnv = {
	NODE_ENV: getEnv("NODE_ENV"),
	GATEWAY_API_KEY: getEnv("GATEWAY_API_KEY"),
	SERVICE_STUDY_URL: getEnv("SERVICE_STUDY_URL"),
	SERVICE_AI_URL: getEnv("SERVICE_AI_URL"),
	SERVICE_SYSTEM_URL: getEnv("SERVICE_SYSTEM_URL"),
	PGHOST: getEnv("PGHOST"),
	PGUSER: getEnv("PGUSER"),
	PGPASSWORD: getEnv("PGPASSWORD"),
	PGPORT: getEnv("PGPORT"),
	INIT_SCHEMA: getEnv("INIT_SCHEMA"),
	EMAIL_HOST: getEnv("EMAIL_HOST"),
	EMAIL_PORT: getEnv("EMAIL_PORT"),
	EMAIL_SECURE: getEnv("EMAIL_SECURE"),
	EMAIL_USER: getEnv("EMAIL_USER"),
	EMAIL_PASSWORD: getEnv("EMAIL_PASSWORD"),
	JWT_SECRET: getEnv("JWT_SECRET"),
	JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
	GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
	GOOGLE_CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET"),
	GOOGLE_REDIRECT_URI: getEnv("GOOGLE_REDIRECT_URI"),
	SESSION_SECRET: getEnv(
		"SESSION_SECRET",
		crypto.randomBytes(32).toString("hex"),
	),
	MEMCACHE_URL: getEnv("MEMCACHE_URL"),
};
