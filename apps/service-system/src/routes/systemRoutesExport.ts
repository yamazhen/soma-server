import { type Express } from "express";
import userRoutes from "./userRoutes.js";

export const setupRoutes = (app: Express): void => {
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "healthy",
      service: "service-system",
      uptime: process.uptime(),
    });
  });

  app.use(userRoutes);
};
