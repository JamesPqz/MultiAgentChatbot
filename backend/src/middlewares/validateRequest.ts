import { Request, Response, NextFunction } from 'express';
import { isValidMessage, sanitizeInput } from '../utils/validator';
import { badRequest } from '../utils/response';

export const validateChatRequest = (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;
    
    if (message !== undefined && !isValidMessage(message)) {
        return badRequest(res, 'Invalid message: must be 1-5000 characters');
    }
    
    if (message) {
        req.body.message = sanitizeInput(message);
    }
    
    next();
};