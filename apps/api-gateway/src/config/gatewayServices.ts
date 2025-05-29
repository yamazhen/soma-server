import { serverEnv, type ServiceConfig } from "@soma-ms/shared";

export const services: ServiceConfig[] = [
	{
		path: "/api/system",
		target: serverEnv.SERVICE_SYSTEM_URL || "http://localhost:3001",
		apiKey: serverEnv.GATEWAY_API_KEY,
	},
	{
		path: "/api/study",
		target: serverEnv.SERVICE_STUDY_URL || "http://localhost:3002",
		apiKey: serverEnv.GATEWAY_API_KEY,
	},
	{
		path: "/api/ai",
		target: serverEnv.SERVICE_AI_URL || "http://localhost:3003",
		apiKey: serverEnv.GATEWAY_API_KEY,
	},
];
