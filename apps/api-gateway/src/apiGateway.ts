import fastifyCors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { configureErrorHandling } from "./apiErrorHandling";
import { registerRoutes } from "./apiRoutes";
import { registerProxies } from "./apiProxies";

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

	async start(options = { port: 3000, host: "localhost" }) {
		try {
			await this.app.listen(options);
			this.app.log.info(`API Gateway running on port ${options.port}`);
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
