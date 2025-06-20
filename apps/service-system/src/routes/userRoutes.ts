import { Router } from "express";
import {
  changeEmailByUsername,
  createUser,
  findAllUsers,
  findUserById,
  findUserByUsername,
  initiateLogin,
  logoutAllDevices,
  logoutUser,
  refreshAccessToken,
  resendEmailVerification,
  resendLoginEmail,
  updateUserProfileByUsername,
  verifyEmailChange,
  verifyLogin,
  verifyUser,
} from "../controllers/userController.js";
import {
  authenticateToken,
  BadRequestError,
  createImageUpload,
  getClientInfo,
  handleRoute,
  type User,
  type UserDto,
  type UserUpdateDto,
} from "@soma-ms/shared";

const router = Router();

const profilePictureUpload = createImageUpload();

/* PUBLIC ENDPOINTS 
   PUBLIC ENDPOINTS 
   PUBLIC ENDPOINTS */

/* V2 user auth */
/* V2 user auth */

// user login
router.post(
  "/api/v2/users/login",
  handleRoute(
    async (req) => {
      const { ip, userAgent } = getClientInfo(req);
      return await initiateLogin(req.body, { ip, userAgent });
    },
    {
      message: "LOGIN_INITIATED",
      statusCode: 201,
    },
  ),
);

// user login verification (completion)
router.post(
  "/api/v2/users/login/verify",
  handleRoute(async (req) => await verifyLogin(req.body), {
    message: "LOGIN_VERIFIED",
    statusCode: 201,
  }),
);

/* V1 user auth */
/* V1 user auth */

// user verification
router.post(
  "/api/v1/users/verify/register",
  handleRoute(
    async (req) =>
      await verifyUser(req.body, { userAgent: req.headers["user-agent"] }),
    {
      message: "User verified successfully",
      statusCode: 201,
    },
  ),
);

// resend email verification
router.post(
  "/api/v1/users/verify/register/resend",
  handleRoute(async (req) => await resendEmailVerification(req.body), {
    message: "EMAIL_VERIFICATION_RESENT",
    statusCode: 201,
  }),
);

// resend login verification code
router.post(
  "/api/v1/users/verify/login/resend",
  handleRoute(async (req) => await resendLoginEmail(req.body), {
    message: "LOGIN_VERIFICATION_CODE_RESENT",
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

// refresh access token (for security)
router.post(
  "/api/v1/users/refresh-token",
  handleRoute(async (req) => await refreshAccessToken(req.body), {
    message: "Token refreshed successfully",
    statusCode: 201,
  }),
);

/* PROTECTED ENDPOINTS 
   PROTECTED ENDPOINTS 
   PROTECTED ENDPOINTS */

router.get(
  "/api/v1/users/me",
  authenticateToken,
  handleRoute(
    async (req) => {
      if (!req.user || !req.user.id) {
        throw new BadRequestError("No user ID found in request");
      }
      const userId = req.user.id;
      const user = await findUserById(userId);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        profile_picture: user.profile_picture,
      };
    },
    {
      message: (user: { username: string }) => `User ${user.username} found`,
      statusCode: 201,
    },
  ),
);

router.get(
  "/api/v1/users/id/:userId",
  authenticateToken,
  handleRoute(
    async (req) => {
      if (!req.params["userId"])
        throw new BadRequestError("No user ID found in request");
      const userId = req.params["userId"];
      return await findUserById(Number.parseInt(userId));
    },
    {
      message: (user: User) => `User ${user.username} found`,
      statusCode: 201,
    },
  ),
);

// get all users
router.get(
  "/api/v1/users",
  authenticateToken,
  handleRoute(async () => await findAllUsers(), {
    message: "All users found",
    statusCode: 201,
  }),
);

// find user by username
router.get(
  "/api/v1/users/username/:username",
  authenticateToken,
  handleRoute(
    async (req) => await findUserByUsername(req.params["username"] as string),
    {
      message: (user: UserDto) => `User with username ${user.username} found`,
      statusCode: 201,
    },
  ),
);

// changing email
router.post(
  "/api/v1/users/change-email",
  authenticateToken,
  handleRoute(async (req) => await changeEmailByUsername(req.body), {
    message: (_res, req) => `Email change requested for ${req.params["email"]}`,
    statusCode: 201,
  }),
);

// email change verification
router.post(
  "/api/v1/users/verify/change-email",
  authenticateToken,
  handleRoute(async (req) => await verifyEmailChange(req.body), {
    message: (_res, req) => `Email verified for ${req.params["newEmail"]}`,
    statusCode: 201,
  }),
);

// update user details by username
router.post(
  "/api/v1/users/:username",
  authenticateToken,
  profilePictureUpload.single("file"),
  handleRoute(
    async (req) => {
      const updateData: any = req.body;

      if (req.file) {
        updateData.profilePictureBuffer = req.file.buffer;
      }

      return await updateUserProfileByUsername(
        req.params["username"] as string,
        updateData,
      );
    },
    {
      message: (_user: UserUpdateDto, req) =>
        `User with username ${req.params["username"]}`,
      statusCode: 201,
    },
  ),
);

// logout
router.post(
  "/api/v1/users/logout",
  authenticateToken,
  handleRoute(async (req) => await logoutUser(req.body), {
    message: (user: UserDto) => `User ${user.username} logged out successfully`,
    statusCode: 200,
  }),
);

// logout everywhere
router.post(
  "/api/v1/users/logout-all",
  authenticateToken,
  handleRoute(async (req) => await logoutAllDevices(req.body), {
    message: "Successfully logged out from all devices",
    statusCode: 200,
  }),
);

export default router;
