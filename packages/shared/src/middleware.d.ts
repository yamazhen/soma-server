import { type Request, type Response, type NextFunction, type ErrorRequestHandler } from "express";
export declare const errorHandler: ErrorRequestHandler;
export declare const notFoundHandler: (req: Request, _res: Response, next: NextFunction) => void;
export declare const gatewayAuthMiddleware: (req: Request, _res: Response, next: NextFunction) => void;
export declare const authenticateToken: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=middleware.d.ts.map