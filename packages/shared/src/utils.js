import path from "path";
export class ErrorTypes extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.name = this.constructor.name;
        this.status = status;
    }
}
export class BadRequestError extends ErrorTypes {
    constructor(message) {
        super(message, 400);
    }
}
export class UnauthorizedError extends ErrorTypes {
    constructor(message) {
        super(message, 401);
    }
}
export class NotFoundError extends ErrorTypes {
    constructor(message) {
        super(message, 404);
    }
}
export class ForbiddenError extends ErrorTypes {
    constructor(message) {
        super(message, 403);
    }
}
export class ConflictError extends ErrorTypes {
    constructor(message) {
        super(message, 409);
    }
}
export class InternalServerError extends ErrorTypes {
    constructor(message) {
        super(message, 500);
    }
}
export const ValidationError = BadRequestError;
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
export const successResponse = (res, options) => {
    const response = { success: true };
    if (options.data !== undefined)
        response.data = options.data;
    if (options.message)
        response.message = options.message;
    if (options.meta)
        response.meta = options.meta;
    return res.status(options.statusCode || 200).json(response);
};
export const handleRoute = (handler, defaultOptions = {}) => {
    return asyncHandler(async (req, res) => {
        const result = await handler(req, res);
        const options = {
            statusCode: req.method === "POST" ? 201 : 200,
            ...defaultOptions,
        };
        if (typeof defaultOptions.message === "function") {
            options.message = defaultOptions.message(result, req);
        }
        if (result && typeof result === "object" && "options" in result) {
            const { data, ...resultOptions } = result;
            successResponse(res, {
                data,
                ...options,
                ...resultOptions,
            });
        }
        else {
            successResponse(res, {
                data: result,
                ...options,
            });
        }
    });
};
export const findRelativePath = (relativePath) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    return path.resolve(absolutePath);
};
export const buildUpdateQuery = (tableName, updates, where, options) => {
    const { returning = true, sqlFunctions = [] } = options || {};
    const updateFields = [];
    const values = [];
    let parameterIndex = 1;
    for (const [field, value] of Object.entries(updates)) {
        if (sqlFunctions.includes(field)) {
            updateFields.push(`${field} = ${value}`);
        }
        else {
            if (value !== undefined) {
                updateFields.push(`${field} = $${parameterIndex}`);
                values.push(value);
                parameterIndex++;
            }
        }
    }
    const whereConditions = [];
    for (const [field, value] of Object.entries(where)) {
        whereConditions.push(`${field} = $${parameterIndex}`);
        values.push(value);
        parameterIndex++;
    }
    let returningClause = "";
    if (returning === true) {
        returningClause = "RETURNING *";
    }
    else if (Array.isArray(returning) && returning.length > 0) {
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
export const updateFieldCheck = (updates) => {
    if (Object.keys(updates).length === 0) {
        throw new BadRequestError("At least one field must be provided for update");
    }
};
//# sourceMappingURL=utils.js.map