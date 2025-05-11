import { type Request, type Response, type NextFunction } from "express";

export const errorHandler = (
  err: Error & { status?: number },
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  res.status(status).json({ status, message });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 404,
    message: `Route not found: ${req.method} ${req.path}`,
  });
};

export const gatewayAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env["GATEWAY_API_KEY"]) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Direct access to this service is not allowed",
    });
    return;
  }

  next();
};
