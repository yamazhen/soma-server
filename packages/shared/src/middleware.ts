import type {
	Request,
	Response,
	NextFunction,
	ErrorRequestHandler,
} from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import {
	ErrorTypes,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from "./utils";
import { serverEnv } from "./config/env";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
	if (serverEnv.NODE_ENV === "development")
		console.error(`[ERROR] ${req.method} ${req.path}:`, err);

	if (err instanceof ErrorTypes) {
		return res.status(err.status).json({
			success: false,
			error: err.message,
		});
	}

	const status = err.status || 500;
	const message = status === 500 ? "Internal server error" : err.message;

	return res.status(status).json({
		success: false,
		error: message,
	});
};

export const notFoundHandler = (
	req: Request,
	_res: Response,
	next: NextFunction,
) => {
	next(new NotFoundError(`Route not found: [${req.method}] ${req.path}`));
};

export const gatewayAuthMiddleware = (
	req: Request,
	_res: Response,
	next: NextFunction,
): void => {
	const apiKey = req.headers["x-api-key"];

	if (!apiKey || apiKey !== serverEnv.GATEWAY_API_KEY) {
		return next(
			new UnauthorizedError("Direct access to this service is not allowed"),
		);
	}

	next();
};

export const authenticateToken = (
	req: Request,
	_res: Response,
	next: NextFunction,
) => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) {
		return next(new UnauthorizedError("Access token required"));
	}

	jwt.verify(token, serverEnv.JWT_SECRET, (err, decoded) => {
		if (err) {
			return next(new ForbiddenError("Invalid or expired token"));
		}

		if (
			decoded &&
			typeof decoded === "object" &&
			"id" in decoded &&
			"username" in decoded &&
			"email" in decoded
		) {
			const jwtPayload = decoded as JwtPayload;
			req.user = {
				id: jwtPayload["id"],
				username: jwtPayload["username"],
				email: jwtPayload["email"],
			} as any;
			next();
			return;
		} else {
			return next(new ForbiddenError("Invalid token payload"));
		}
	});
};
