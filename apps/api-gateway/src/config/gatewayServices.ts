import type { ServiceConfig } from "@soma-ms/shared";

export const services: ServiceConfig[] = [
  {
    path: "/api/system",
    target: process.env["SERVICE_SYSTEM_URL"] || "http://localhost:3001",
    apiKey: process.env["GATEWAY_API_KEY"],
  },
  {
    path: "/api/study",
    target: process.env["SERVICE_STUDY_URL"] || "http://localhost:3002",
    apiKey: process.env["GATEWAY_API_KEY"],
  },
  {
    path: "/api/ai",
    target: process.env["SERVICE_AI_URL"] || "http://localhost:3003",
    apiKey: process.env["GATEWAY_API_KEY"],
  },
];
