import { NextFunction, Response, Request } from 'express';

// Test code
export const testMiddleware = (req: Request, res: Response, next: NextFunction) => {
    req.body.testCounter = req.body.testCounter ? (req.body.testCounter + 1) : 1;
    next();
};