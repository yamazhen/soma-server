import express from "express";
import {
  authenticateToken,
  BadRequestError,
  findRelativePath,
  handleRoute,
  serverEnv,
} from "@soma-ms/shared";
import fs from "node:fs";
import crypto from "node:crypto";
import { AuthService } from "../services/authService";
import { OAuth2Client } from "google-auth-library";
import { stateStore } from "../services/stateService";

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
      message: "GOOGLE_LOGIN_SUCCESS",
      statusCode: 201,
    },
  ),
);

router.get(
  "/api/v1/users/auth/google/init",
  handleRoute(
    async (req) => {
      const state = crypto.randomBytes(32).toString("hex");
      const clientType = (req.query as { client?: string }).client || "web";
      await stateStore.set(state, { clientType, timestamp: Date.now() }, 600);

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.append("client_id", serverEnv.GOOGLE_CLIENT_ID);
      authUrl.searchParams.append(
        "redirect_uri",
        serverEnv.GOOGLE_REDIRECT_URI,
      );
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("scope", "email profile");
      authUrl.searchParams.append("state", state);

      return {
        authUrl: authUrl.toString(),
      };
    },
    {
      message: "GOOGLE_AUTH_INIT_SUCCESS",
    },
  ),
);

router.get("/api/v1/users/auth/google/callback", async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };

  if (!state) {
    throw new BadRequestError("INVALID_STATE");
  }

  const stateData = await stateStore.get(state);
  if (!stateData) {
    console.error("State not found in store");
    throw new BadRequestError("INVALID_STATE");
  }
  await stateStore.delete(state);

  try {
    const oAuth2Client = new OAuth2Client(
      serverEnv.GOOGLE_CLIENT_ID,
      serverEnv.GOOGLE_CLIENT_SECRET,
      serverEnv.GOOGLE_REDIRECT_URI,
    );

    const tokenResponse = await oAuth2Client.getToken(code as string);
    const idToken = tokenResponse.tokens.id_token;

    if (!idToken) {
      throw new BadRequestError("ID_TOKEN_NOT_OBTAINED");
    }

    const authResponse = await authService.handleGoogleLogin(idToken);

    const clientType = stateData.clientType || "web";

    switch (clientType) {
      case "desktop": {
        const responseData = encodeURIComponent(
          JSON.stringify({
            success: true,
            tokens: authResponse.tokens,
          }),
        );
        return res.redirect(`soma://auth/callback?data=${responseData}`);
      }
      case "mobile":
        // handle mobile type in the future
        return res.redirect("/mobile-app");
      case "web":
        // web app in the future
        return res.redirect("/hypothetical-web-app");
    }
  } catch (error) {
    console.error("Error during Google OAuth callback:", error);
    const clientType = stateData.clientType || "web";
    if (clientType === "desktop") {
      return res.redirect(
        `http://localhost:3000/auth?error=${encodeURIComponent("GOOGLE_AUTH_ERROR")}`,
      );
    }
    return res.redirect("/error-page");
  }
});

router.get(
  "/api/v1/users/auth/google/desktop",
  authenticateToken,
  async (_req, res) => {
    const htmlPath = findRelativePath("src/public/oauth-google-desktop.html");
    res.sendFile(htmlPath);
  },
);

if (serverEnv.NODE_ENV === "development") {
  router.get("/api/v1/users/auth/test-google", (_req, res) => {
    const htmlPath = findRelativePath("src/public/test-auth-google.html");
    fs.readFile(htmlPath, "utf-8", (err, html) => {
      if (err) return res.status(500).send("Server error");

      const rendered = html.replace(
        /data-client_id=".*?"/,
        `data-client_id="${serverEnv.GOOGLE_CLIENT_ID ?? ""}"`,
      );
      return res.send(rendered);
    });
  });
}

export default router;
