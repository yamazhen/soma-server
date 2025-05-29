import { serverEnv } from "@soma-ms/shared";
import type { FastifyInstance } from "fastify";

export function configureErrorHandling(app: FastifyInstance) {
	app.setErrorHandler((error, _request, reply) => {
		app.log.error(error);
		reply.status(500).send({
			error: "Internal Server Error",
			message:
				serverEnv.NODE_ENV === "development"
					? error.message
					: "An unexpected error occurred.",
		});
	});
}
