import { startServer } from "./aiService.server.js";

startServer().catch((err) => {
  console.error("Failed to start AI Service:", err);
  process.exit(1);
});
