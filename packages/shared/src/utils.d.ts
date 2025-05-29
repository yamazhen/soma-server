import type { Request, Response, NextFunction } from "express";
import type { RouteHandlerFunction, RouteOptions, SuccessResponseOptions } from "./types/typesExport.js";
export declare class ErrorTypes extends Error {
    status: number;
    constructor(message: string, status: number);
}
export declare class BadRequestError extends ErrorTypes {
    constructor(message: string);
}
export declare class UnauthorizedError extends ErrorTypes {
    constructor(message: string);
}
export declare class NotFoundError extends ErrorTypes {
    constructor(message: string);
}
export declare class ForbiddenError extends ErrorTypes {
    constructor(message: string);
}
export declare class ConflictError extends ErrorTypes {
    constructor(message: string);
}
export declare class InternalServerError extends ErrorTypes {
    constructor(message: string);
}
export declare const ValidationError: typeof BadRequestError;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const successResponse: (res: Response, options: SuccessResponseOptions) => Response<any, Record<string, any>>;
export declare const handleRoute: <T = any>(handler: RouteHandlerFunction<T>, defaultOptions?: RouteOptions) => (req: Request, res: Response, next: NextFunction) => void;
export declare const findRelativePath: (relativePath: string) => string;
export declare const buildUpdateQuery: (tableName: string, updates: Record<string, any>, where: Record<string, any>, options?: {
    returning?: boolean | string[];
    sqlFunctions?: string[];
}) => {
    query: string;
    values: any[];
};
export declare const updateFieldCheck: (updates: Record<string, any>) => void;
//# sourceMappingURL=utils.d.ts.map