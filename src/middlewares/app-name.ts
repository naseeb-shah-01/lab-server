import { Request, Response, NextFunction } from 'express';


export const checkAppName = async (req: Request, res: Response, next: NextFunction) => {
    const APP_NAME = req.get('APP_NAME');
    if (!APP_NAME) {
        res.setHeader('APP_NAME_REQUIRED', 'YES');
        res.customErrorRes(503);
        return;
    }

    next();
}
