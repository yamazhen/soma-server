import type { Request, Response, NextFunction } from "express";
import type {
	RouteHandlerFunction,
	RouteOptions,
	SuccessResponseOptions,
} from "./types/typesExport";
import path from "node:path";

export class ErrorTypes extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = this.constructor.name;
		this.status = status;
	}
}

export class BadRequestError extends ErrorTypes {
	constructor(message: string) {
		super(message, 400);
	}
}

export class UnauthorizedError extends ErrorTypes {
	constructor(message: string) {
		super(message, 401);
	}
}

export class NotFoundError extends ErrorTypes {
	constructor(message: string) {
		super(message, 404);
	}
}

export class ForbiddenError extends ErrorTypes {
	constructor(message: string) {
		super(message, 403);
	}
}

export class ConflictError extends ErrorTypes {
	constructor(message: string) {
		super(message, 409);
	}
}

export class InternalServerError extends ErrorTypes {
	constructor(message: string) {
		super(message, 500);
	}
}

export const ValidationError = BadRequestError;

export const asyncHandler =
	(fn: Function) => (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};

export const successResponse = (
	res: Response,
	options: SuccessResponseOptions,
) => {
	const response: any = { success: true };

	if (options.data !== undefined) response.data = options.data;
	if (options.message) response.message = options.message;
	if (options.meta) response.meta = options.meta;

	return res.status(options.statusCode || 200).json(response);
};

export const handleRoute = <T = any>(
	handler: RouteHandlerFunction<T>,
	defaultOptions: RouteOptions = {},
) => {
	return asyncHandler(async (req: Request, res: Response) => {
		const result = await handler(req, res);

		const options: RouteOptions = {
			statusCode: req.method === "POST" ? 201 : 200,
			...defaultOptions,
		};

		if (typeof defaultOptions.message === "function") {
			options.message = defaultOptions.message(result, req);
		}

		if (result && typeof result === "object" && "options" in result) {
			const { data, ...resultOptions } = result as any;
			successResponse(res, {
				data,
				...options,
				...resultOptions,
			});
		} else {
			successResponse(res, {
				data: result,
				...options,
			});
		}
	});
};

export const findRelativePath = (relativePath: string) => {
	const absolutePath = path.join(process.cwd(), relativePath);
	return path.resolve(absolutePath);
};

export const buildUpdateQuery = (
	tableName: string,
	updates: Record<string, any>,
	where: Record<string, any>,
	options?: {
		returning?: boolean | string[];
		sqlFunctions?: string[];
	},
) => {
	const { returning = true, sqlFunctions = [] } = options || {};
	const updateFields: string[] = [];
	const values: any[] = [];
	let parameterIndex = 1;

	for (const [field, value] of Object.entries(updates)) {
		if (sqlFunctions.includes(field)) {
			updateFields.push(`${field} = ${value}`);
		} else {
			if (value !== undefined) {
				updateFields.push(`${field} = $${parameterIndex}`);
				values.push(value);
				parameterIndex++;
			}
		}
	}

	const whereConditions: string[] = [];
	for (const [field, value] of Object.entries(where)) {
		whereConditions.push(`${field} = $${parameterIndex}`);
		values.push(value);
		parameterIndex++;
	}

	let returningClause = "";
	if (returning === true) {
		returningClause = "RETURNING *";
	} else if (Array.isArray(returning) && returning.length > 0) {
		returningClause = `RETURNING ${returning.join(", ")}`;
	}

	const query = `
UPDATE ${tableName}
SET ${updateFields.join(", ")}
WHERE ${whereConditions.join(" AND ")}
${returningClause}
`;

	return { query, values };
};

export const updateFieldCheck = (updates: Record<string, any>): void => {
	if (Object.keys(updates).length === 0) {
		throw new BadRequestError("At least one field must be provided for update");
	}
};
