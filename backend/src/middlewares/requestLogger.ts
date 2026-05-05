import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { Timer } from '../utils/performance';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const timer = new Timer();
    
    logger.request(req);
    
    res.on('finish', () => {
        logger.response(res.statusCode, timer.elapsed());
    });
    
    next();
};