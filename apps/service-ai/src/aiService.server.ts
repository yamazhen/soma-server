import { app } from "./aiService.app.js";

export async function startServer() {
  try {
    const PORT = 8002;

    app.listen(PORT, () => {
      console.log(`AI Service running on port ${PORT}`);
    });
  } catch (e) {
    console.error("Error starting AI Service:", e);
    process.exit(1);
  }
}
