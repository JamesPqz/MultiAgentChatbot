import { Response } from 'express';

interface SuccessResponse {
    success: true;
    message?: string;
    data?: any;
    [key: string]: any;
}

interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: any;
}

export const success = (
    res: Response,
    data?: any,
    message?: string,
    statusCode: number = 200
): Response => {
    const response: SuccessResponse = { success: true };
    if (message) response.message = message;
    if (data !== undefined) response.data = data;
    return res.status(statusCode).json(response);
};

export const successWithExtras = (
    res: Response,
    data: any,
    extras: Record<string, any>
): Response => {
    return res.status(200).json({
        success: true,
        data,
        ...extras
    });
};

const sendError = (
    res: Response,
    errorMessage: string,
    statusCode: number = 500,
    code?: string,
    details?: any
): Response => {
    const response: ErrorResponse = { success: false, error: errorMessage };
    if (code) response.code = code;
    if (details) response.details = details;
    return res.status(statusCode).json(response);
};

/**
 * 400 error（request error）
 */
export const badRequest = (res: Response, errorMessage: string, details?: any): Response => {
    return sendError(res, errorMessage, 400, 'BAD_REQUEST', details);
};

/**
 * 401 error(unauthorized)
 */
export const unauthorized = (res: Response, errorMessage: string = 'Unauthorized'): Response => {
    return sendError(res, errorMessage, 401, 'UNAUTHORIZED');
};

/**
 * 403 error (forbidden)
 */
export const forbidden = (res: Response, errorMessage: string = 'Forbidden'): Response => {
    return sendError(res, errorMessage, 403, 'FORBIDDEN');
};

/**
 * 404 error (not found)
 */
export const notFound = (res: Response, errorMessage: string = 'Resource not found'): Response => {
    return sendError(res, errorMessage, 404, 'NOT_FOUND');
};

/**
 * 409 error (conflict)
 */
export const conflict = (res: Response, errorMessage: string = 'Conflict'): Response => {
    return sendError(res, errorMessage, 409, 'CONFLICT');
};

/**
 * 429 error (too many requests)
 */
export const tooManyRequests = (res: Response, errorMessage: string = 'Too many requests'): Response => {
    return sendError(res, errorMessage, 429, 'TOO_MANY_REQUESTS');
};

/**
 * 500 error (internal server error)
 */
export const internalError = (res: Response, errorMessage: string = 'Internal server error'): Response => {
    return sendError(res, errorMessage, 500, 'INTERNAL_ERROR');
};