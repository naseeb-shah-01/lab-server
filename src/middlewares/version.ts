import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../helpers/redis-helper';

class AppVersions {
    activeVersions: string[];
    latestVersion: string;
    latestVersionDescription: string;
}

export const checkVersion = async (req: Request, res: Response, next: NextFunction) => {
    const APP_NAME = req.get('APP_NAME');
    const APP_VERSION = req.get('APP_VERSION');

    if (!APP_VERSION) {
        res.setHeader('VERSION_REQUIRED', 'YES');
        res.customErrorRes(503);
        return;
    }

    let appVersions: AppVersions = (await redisClient.get('appVersions.' + APP_NAME) as AppVersions);

    if (!appVersions || !appVersions.activeVersions.includes(APP_VERSION)) {
        res.setHeader('VERSION_EXPIRED', 'YES');
        if (appVersions && appVersions.latestVersion) {
            res.setHeader('UPDATE_AVAILABLE', 'YES');
            res.setHeader('NEW_VERSION', appVersions.latestVersion);
            res.setHeader('NEW_VERSION_DESC', appVersions.latestVersionDescription);
        }
        res.customErrorRes(410);
        return;
    }

    if (appVersions && appVersions.latestVersion && appVersions.latestVersion !== APP_VERSION) {
        res.setHeader('UPDATE_AVAILABLE', 'YES');
        res.setHeader('NEW_VERSION', appVersions.latestVersion);
        res.setHeader('NEW_VERSION_DESC', appVersions.latestVersionDescription);
    }

    next();
}
