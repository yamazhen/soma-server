import { Database, initSchema, serverEnv } from "@soma-ms/shared";
import { app } from "./systemService.app";
import { schemas } from "./models/systemModelsExport";
import { emailService } from "./services/emailService";

export async function startServer() {
	Database.init("soma-system");
	initSchema(schemas);
	await emailService.verifyConnection();
	const PORT = Number.parseInt(serverEnv.SERVICE_SYSTEM_PORT);

	app.listen(PORT, () => {
		console.log(`System Service running on port ${PORT}`);
	});
}
