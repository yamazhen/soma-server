import type { FastifyInstance } from "fastify";

export function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      status: "healthy",
      service: "api-gateway",
      uptime: process.uptime(),
    };
  });
}
