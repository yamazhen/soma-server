import { Database, initSchema } from "@soma-ms/shared";
import { app } from "./systemService.app.js";
import { schemas } from "./models/systemModelsExport.js";

export async function startServer() {
  Database.init("soma-system");
  initSchema(schemas);
  const PORT = 8001;

  app.listen(PORT, () => {
    console.log(`System Service running on port ${PORT}`);
  });
}
