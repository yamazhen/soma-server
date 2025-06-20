import { startServer } from "./systemService.server.js";

startServer().catch((err) => {
  console.error("Failed to start System Service:", err);
  process.exit(1);
});
