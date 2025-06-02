import fastifyCors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { configureErrorHandling } from "./apiErrorHandling";
import { registerRoutes } from "./apiRoutes";
import { registerProxies } from "./apiProxies";
import { serverEnv } from "@soma-ms/shared";

export class ApiGateway {
  private app: FastifyInstance;

  constructor() {
    this.app = Fastify({
      logger: true,
    });
  }

  async configure() {
    await this.app.register(fastifyCors);
    configureErrorHandling(this.app);
    registerRoutes(this.app);
    registerProxies(this.app);
    return this;
  }

  async start(options?: { port?: number; host?: string }) {
    const port = options?.port || Number.parseInt(serverEnv.API_GATEWAY_PORT);
    const host = options?.host || "0.0.0.0";
    try {
      await this.app.listen({ port, host });
      this.app.log.info(`API Gateway running on port ${port}`);
      return this.app;
    } catch (e) {
      this.app.log.error(e);
      process.exit(1);
    }
  }
}

export async function startGateway() {
  const gateway = new ApiGateway();
  await gateway.configure();
  return gateway.start();
}
