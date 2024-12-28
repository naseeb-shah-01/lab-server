import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../helpers/redis-helper';


export const checkRegisteredApp = async (req: Request, res: Response, next: NextFunction) => {
    const APP_NAME = req.get('APP_NAME');

    let apps: string[] = (await redisClient.get('apps') as string[]) || [];
    if (!apps.includes(APP_NAME)) {
        res.setHeader('UNKNOWN_APP', 'YES');
        res.customErrorRes(503);
        return;
    }

    next();
}
