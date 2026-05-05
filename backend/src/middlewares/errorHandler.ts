import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { internalError } from '../utils/response';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    logger.error(err.message, err.stack);
    internalError(res, err.message || 'Internal server error');
};