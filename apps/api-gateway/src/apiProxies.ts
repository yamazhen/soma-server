import fastifyHttpProxy from "@fastify/http-proxy";
import type { ServiceConfig } from "@soma-ms/shared";
import type { FastifyInstance } from "fastify";
import { services } from "./config/gatewayServices.js";

export function createProxy(app: FastifyInstance, config: ServiceConfig) {
  app.register(fastifyHttpProxy, {
    prefix: config.path,
    upstream: config.target,
    rewritePrefix: "/api",
    preHandler: async (req) => {
      if (config.apiKey) {
        req.headers["x-api-key"] = config.apiKey;
      }
      req.headers["x-forwarded-for"] = "api-gateway";
    },
  });
  app.log.info(`Proxy registered for ${config.path} -> ${config.target}`);
}

export function registerProxies(app: FastifyInstance) {
  services.forEach((service) => {
    createProxy(app, service);
  });

  app.log.info("Configured services:");
  services.forEach((service) => {
    app.log.info(`- ${service.path} -> ${service.target}`);
  });
}
