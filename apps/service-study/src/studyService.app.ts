import express from "express";
import cors from "cors";
import {
  errorHandler,
  gatewayAuthMiddleware,
  notFoundHandler,
} from "@soma-ms/shared";

const app = express();

app.use(cors());
app.use(gatewayAuthMiddleware);
app.use(express.json());

// create a setup route function later in another file
// setupRoutes(app);

// temporary routes
app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "service-study",
    uptime: process.uptime(),
  });
});

app.get("/api/courses", (_req, res) => {
  res.json({
    data: [
      { id: 1, name: "Mathematics 101" },
      { id: 2, name: "Physics 202" },
      { id: 3, name: "Computer Science 303" },
    ],
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
