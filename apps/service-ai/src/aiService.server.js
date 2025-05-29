import { serverEnv } from "@soma-ms/shared";
import { app } from "./aiService.app";
export async function startServer() {
    try {
        const PORT = Number.parseInt(serverEnv.SERVICE_AI_PORT);
        app.listen(PORT, () => {
            console.log(`AI Service running on port ${PORT}`);
        });
    }
    catch (e) {
        console.error("Error starting AI Service:", e);
        process.exit(1);
    }
}
//# sourceMappingURL=aiService.server.js.map