import express from "express";
import { SocialAuthService } from "../services/socialAuthService.js";
import { BadRequestError, handleRoute } from "@soma-ms/shared";

const router = express.Router();
const socialAuthService = new SocialAuthService();

router.post(
  "/api/v1/users/auth/google",
  handleRoute(
    async (req) => {
      const { idToken } = req.body;

      if (!idToken) {
        throw new BadRequestError("idToken is required");
      }

      return await socialAuthService.handleGoogleLogin(idToken);
    },
    {
      message: "Google login successful",
      statusCode: 201,
    },
  ),
);

router.post(
  "/api/v1/users/auth/apple",
  handleRoute(
    async (req) => {
      const { idToken, authorizationCode, user } = req.body;

      if (!idToken) {
        throw new BadRequestError("ID token is required");
      }

      return await socialAuthService.handleAppleLogin({
        idToken,
        authorizationCode,
        user,
      });
    },
    {
      message: "Apple login successful",
      statusCode: 201,
    },
  ),
);

export default router;
