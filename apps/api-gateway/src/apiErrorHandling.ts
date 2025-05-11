import type { FastifyInstance } from "fastify";

export function configureErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      error: "Internal Server Error",
      message:
        process.env["NODE_ENV"] === "development"
          ? "An error occurred"
          : error.message,
    });
  });
}
