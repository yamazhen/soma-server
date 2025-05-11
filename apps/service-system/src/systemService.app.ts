import express from "express";
import cors from "cors";
import {
  errorHandler,
  gatewayAuthMiddleware,
  notFoundHandler,
} from "@soma-ms/shared";
import { setupRoutes } from "./routes/systemRoutesExport.js";

const app = express();

app.use(cors());
app.use(gatewayAuthMiddleware);
app.use(
  express.json({
    limit: "10mb",
  }),
);

setupRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
