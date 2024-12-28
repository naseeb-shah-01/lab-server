import { Request, Response, NextFunction } from 'express';
import log from '../helpers/logger';

export const checkRenewUser = (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.getUser();
        if (user) {
            let clientUpdatedAt = req.get('USER_UPDATED_AT');
            if (!clientUpdatedAt) {
                res.setHeader('USER_UPDATED_AT_REQUIRED', 'YES');
                res.customErrorRes(401);
                return;
            }
            if (req.session.update) {
                delete req.session.update;
                res.setHeader('RENEW_USER', 'YES');
            } else if (user.updatedAt) {
                if (new Date(user.updatedAt).toISOString() !== new Date(clientUpdatedAt).toISOString()) {
                    res.setHeader('RENEW_USER', 'YES');
                }
            }
        }
        next();
    } catch (error) {
        log.error('Error checking Renew User : ', error);
        res.errorRes(500);
    }
}