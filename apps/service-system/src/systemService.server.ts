import { Database, initSchema } from "@soma-ms/shared";
import { app } from "./systemService.app.js";
import { schemas } from "./models/systemModelsExport.js";
import { emailService } from "./services/emailService.js";

export async function startServer() {
  Database.init("soma-system");
  initSchema(schemas);
  await emailService.verifyConnection();
  const PORT = 8001;

  app.listen(PORT, () => {
    console.log(`System Service running on port ${PORT}`);
  });
}
