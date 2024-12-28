import { Request, Response, NextFunction } from 'express';

export const checkUserAuth = async (req: Request, res: Response, next: NextFunction) => {
    let user = req.getUser();
    if (!user) {
        res.setHeader('SESSION_EXPIRED', 'YES');
        res.customErrorRes(401, 'Session is expired.', 'SESSION_EXPIRED');
        return;
    }
    next();
}