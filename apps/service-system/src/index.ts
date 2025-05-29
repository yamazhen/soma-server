import { startServer } from "./systemService.server";

startServer().catch((err) => {
	console.error("Failed to start System Service:", err);
	process.exit(1);
});
