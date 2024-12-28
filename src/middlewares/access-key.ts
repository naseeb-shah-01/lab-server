import { Request, Response, NextFunction } from 'express';
import config from '../../config.json';

export const checkAccessKey = (req: Request, res: Response, next: NextFunction) => {
    let accessKey = req.get('accessKey');
    if (!accessKey || config.maintenanceKey !== accessKey) {
        res.errorRes(401);
        return;
    }
    next();
};