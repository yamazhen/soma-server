import express from "express";
import cors from "cors";
import {
	errorHandler,
	gatewayAuthMiddleware,
	notFoundHandler,
	serverEnv,
} from "@soma-ms/shared";
import { setupRoutes } from "./routes/systemRoutesExport.js";

const app = express();

app.use(cors());
app.use(gatewayAuthMiddleware);
app.use(express.json());

console.log(serverEnv.GOOGLE_REDIRECT_URI);
console.log(serverEnv.GOOGLE_REDIRECT_URI);
console.log(serverEnv.GOOGLE_REDIRECT_URI);
console.log(serverEnv.GOOGLE_REDIRECT_URI);
console.log(serverEnv.GOOGLE_REDIRECT_URI);
console.log(serverEnv.GOOGLE_REDIRECT_URI);
setupRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
