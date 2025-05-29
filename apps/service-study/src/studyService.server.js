import { serverEnv } from "@soma-ms/shared";
import { app } from "./studyService.app";
export async function startServer() {
    const PORT = Number.parseInt(serverEnv.SERVICE_STUDY_PORT);
    app.listen(PORT, () => {
        console.log(`Study Service running on port ${PORT}`);
    });
}
//# sourceMappingURL=studyService.server.js.map