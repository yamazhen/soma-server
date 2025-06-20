import { startServer } from "./studyService.server.js";

startServer().catch((err) => {
  console.error("Failed to start Study Service:", err);
  process.exit(1);
});
