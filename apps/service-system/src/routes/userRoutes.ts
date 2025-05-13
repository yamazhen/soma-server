import { Router } from "express";
import {
  createUser,
  findAllUsers,
  findUserByUsername,
  loginUser,
  logoutAllDevices,
  logoutUser,
  refreshAccessToken,
  verifyUser,
} from "../controllers/userController.js";
import { authenticateToken, handleRoute, type UserDto } from "@soma-ms/shared";

const router = Router();

// protected endpoints
router.get(
  "/api/v1/users",
  authenticateToken,
  handleRoute(async () => await findAllUsers(), {
    message: "All users found",
    statusCode: 201,
  }),
);
router.get(
  "/api/v1/users/:username",
  authenticateToken,
  handleRoute(
    async (req) => await findUserByUsername(req.params["username"] as string),
    {
      message: (user: UserDto) => `User with username ${user.username} found`,
      statusCode: 201,
    },
  ),
);
router.post(
  "/api/v1/users/logout",
  authenticateToken,
  handleRoute(async (req) => await logoutUser(req.body), {
    message: (user: UserDto) => `User ${user.username} logged out successfully`,
    statusCode: 200,
  }),
);
router.post(
  "/api/v1/users/logout-all",
  authenticateToken,
  handleRoute(async (req) => await logoutAllDevices(req.body), {
    message: "Successfully logged out from all devices",
    statusCode: 200,
  }),
);

/* PUBLIC ENDPOINTS */
// user verification
router.post(
  "/api/v1/users/verify",
  handleRoute(async (req) => await verifyUser(req.body), {
    message: "User verified successfully",
    statusCode: 201,
  }),
);

// user creation (registration)
router.post(
  "/api/v1/users",
  handleRoute(async (req) => await createUser(req.body), {
    message: "User created successfully",
    statusCode: 201,
  }),
);

// user login
router.post(
  "/api/v1/users/login",
  handleRoute(
    async (req) =>
      await loginUser(req.body, {
        userAgent: req.headers["user-agent"],
      }),
    {
      message: "User logged in successfully",
      statusCode: 201,
    },
  ),
);

// refresh access token (for security)
router.post(
  "/api/v1/users/refresh-token",
  handleRoute(async (req) => await refreshAccessToken(req.body), {
    message: "Token refreshed successfully",
    statusCode: 201,
  }),
);

export default router;
