import { Database, initSchema, serverEnv } from "@soma-ms/shared";
import { app } from "./systemService.app.js";
import { schemas } from "./models/systemModelsExport.js";
import { emailService } from "./services/emailService.js";

export async function startServer() {
	Database.init("soma-system");
	initSchema(schemas);
	await emailService.verifyConnection();
	const PORT = Number.parseInt(serverEnv.SERVICE_SYSTEM_PORT);

	app.listen(PORT, () => {
		console.log(`System Service running on port ${PORT}`);
	});
}
