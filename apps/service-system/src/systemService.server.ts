import { Database, initSchema, serverEnv } from "@soma-ms/shared";
import { app } from "./systemService.app";
import { schemas } from "./models/systemModelsExport";
import { emailService } from "./services/emailService";
import { stateStore } from "./services/stateService";

export async function startServer() {
	await Database.init("soma-system");
	await initSchema(schemas);
	await emailService.verifyConnection();
	const PORT = Number.parseInt(serverEnv.SERVICE_SYSTEM_PORT);

	stateStore.setupCleanup();

	app.listen(PORT, () => {
		console.log(`System Service running on port ${PORT}`);
	});
}
