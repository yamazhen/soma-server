import { Router } from "express";
import {
	changeEmailByUsernameOrEmail,
	createUser,
	findAllUsers,
	findUserById,
	findUserByUsername,
	loginUser,
	logoutAllDevices,
	logoutUser,
	refreshAccessToken,
	updateUserProfileByUsername,
	verifyEmailChange,
	verifyUser,
} from "../controllers/userController";
import {
	authenticateToken,
	BadRequestError,
	handleRoute,
	type User,
	type UserDto,
	type UserUpdateDto,
} from "@soma-ms/shared";

const router = Router();

/* PUBLIC ENDPOINTS 
   PUBLIC ENDPOINTS 
   PUBLIC ENDPOINTS */

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
			return await findUserById(parseInt(userId));
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
	handleRoute(async (req) => await changeEmailByUsernameOrEmail(req.body), {
		message: (_res, req) =>
			`Email change requested for ${req.params["originalEmail"]}`,
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
	handleRoute(
		async (req) =>
			await updateUserProfileByUsername(
				req.params["username"] as string,
				req.body,
			),
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
