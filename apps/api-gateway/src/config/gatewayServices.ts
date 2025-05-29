import { serverEnv, type ServiceConfig } from "@soma-ms/shared";

export const services: ServiceConfig[] = [
	{
		path: "/api/system",
		target:
			serverEnv.SERVICE_SYSTEM_URL ||
			`http://localhost:${serverEnv.SERVICE_SYSTEM_PORT}`,
		apiKey: serverEnv.GATEWAY_API_KEY,
	},
	{
		path: "/api/study",
		target:
			serverEnv.SERVICE_STUDY_URL ||
			`http://localhost:${serverEnv.SERVICE_STUDY_PORT}`,
		apiKey: serverEnv.GATEWAY_API_KEY,
	},
	{
		path: "/api/ai",
		target:
			serverEnv.SERVICE_AI_URL ||
			`http://localhost:${serverEnv.SERVICE_AI_PORT}`,
		apiKey: serverEnv.GATEWAY_API_KEY,
	},
];
