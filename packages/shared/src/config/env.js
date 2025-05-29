import crypto from "node:crypto";
function getEnv(key, fallback = "") {
    return process.env[key] ?? fallback;
}
function getEnvRequired(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable ${key} is required but not set.`);
    }
    return value;
}
export const serverEnv = {
    NODE_ENV: getEnv("NODE_ENV"),
    // ports for the services
    API_GATEWAY_PORT: getEnv("API_GATEWAY_PORT", "3000"),
    SERVICE_SYSTEM_PORT: getEnv("SERVICE_SYSTEM_PORT", "3001"),
    SERVICE_STUDY_PORT: getEnv("SERVICE_STUDY_PORT", "3002"),
    SERVICE_AI_PORT: getEnv("SERVICE_AI_PORT", "3003"),
    GATEWAY_API_KEY: getEnvRequired("GATEWAY_API_KEY"),
    SERVICE_SYSTEM_URL: getEnv("SERVICE_SYSTEM_URL", "http://localhost:3001"),
    SERVICE_STUDY_URL: getEnv("SERVICE_STUDY_URL", "http://localhost:3002"),
    SERVICE_AI_URL: getEnv("SERVICE_AI_URL", "http://localhost:3003"),
    PGHOST: getEnv("PGHOST"),
    PGUSER: getEnv("PGUSER"),
    PGPASSWORD: getEnv("PGPASSWORD"),
    PGPORT: getEnv("PGPORT"),
    INIT_SCHEMA: getEnv("INIT_SCHEMA"),
    EMAIL_HOST: getEnv("EMAIL_HOST"),
    EMAIL_PORT: getEnv("EMAIL_PORT", "587"),
    EMAIL_SECURE: getEnv("EMAIL_SECURE", "false"),
    EMAIL_USER: getEnv("EMAIL_USER"),
    EMAIL_PASSWORD: getEnv("EMAIL_PASSWORD"),
    JWT_SECRET: getEnv("JWT_SECRET"),
    JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
    GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET"),
    GOOGLE_REDIRECT_URI: getEnv("GOOGLE_REDIRECT_URI"),
    SESSION_SECRET: getEnv("SESSION_SECRET", crypto.randomBytes(32).toString("hex")),
    MEMCACHE_URL: getEnv("MEMCACHE_URL"),
};
//# sourceMappingURL=env.js.map