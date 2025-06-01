import express from "express";
import cors from "cors";
import {
  configureCloudinary,
  errorHandler,
  gatewayAuthMiddleware,
  notFoundHandler,
} from "@soma-ms/shared";
import { setupRoutes } from "./routes/systemRoutesExport";

configureCloudinary();

const app = express();

app.use(cors());
app.use(gatewayAuthMiddleware);
app.use(express.json());

setupRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
