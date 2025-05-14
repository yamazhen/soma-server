import express from "express";
import {
  BadRequestError,
  findRelativePath,
  handleRoute,
} from "@soma-ms/shared";
import fs from "fs";
import { AuthService } from "../services/authService.js";

const router = express.Router();
const authService = new AuthService();

router.post(
  "/api/v1/users/auth/google",
  handleRoute(
    async (req) => {
      const { idToken } = req.body;

      if (!idToken) {
        throw new BadRequestError("idToken is required");
      }

      return await authService.handleGoogleLogin(idToken);
    },
    {
      message: "Google login successful",
      statusCode: 201,
    },
  ),
);

if (process.env["NODE_ENV"] === "development") {
  router.get("/api/v1/users/auth/test-google", (_req, res) => {
    const htmlPath = findRelativePath("src/public/test-auth-google.html");
    fs.readFile(htmlPath, "utf-8", (err, html) => {
      if (err) return res.status(500).send("Server error");

      const rendered = html.replace(
        /data-client_id=".*?"/,
        `data-client_id="${process.env["GOOGLE_CLIENT_ID"] ?? ""}"`,
      );
      return res.send(rendered);
    });
  });
}

export default router;
