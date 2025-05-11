import { app } from "./studyService.app.js";

export async function startServer() {
  const PORT = 8003;

  app.listen(PORT, () => {
    console.log(`Study Service running on port ${PORT}`);
  });
}
