import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../helpers/redis-helper';


export const checkMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    const APP_NAME = req.get('APP_NAME');

    let appsUnderMaintenance: string[] = (await redisClient.get('appsUnderMaintenance') as string[]) || [];
    if (appsUnderMaintenance.includes(APP_NAME)) {
        res.setHeader('MAINTENANCE', 'YES');
        res.customErrorRes(503);
        return;
    }

    next();
}
