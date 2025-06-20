import { Database, initSchema, serverEnv } from "@soma-ms/shared";
import { app } from "./systemService.app.js";
import { schemas } from "./models/systemModelsExport.js";
import { emailService } from "./services/emailService.js";
import { stateStore } from "./services/stateService.js";

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
