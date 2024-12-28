import { model } from 'mongoose';
import { IMaintenance } from '../models/general/maintenance';
const Maintenance = model<IMaintenance>('Maintenance');
import { IVersion } from '../models/general/version';
const Version = model<IVersion>('Version');
import log from './logger';
import { redisClient } from './redis-helper';


export const refreshData = async () => {
    try {

        // Maintenance refresh
        Maintenance.find({
            status: 'active'
        }).then(apps => {
            let appsData = apps.map(app => app.appName);
            let maintenanceData = apps.filter(app => app.maintenance).map(app => app.appName);
            redisClient.set('apps', appsData);
            redisClient.set('appsUnderMaintenance', maintenanceData);
        });

        // Versions refresh
        Version.aggregate([
            {
                $match: {
                    status: 'active',
                    active: true
                }
            },
            {
                $group: {
                    _id: '$appName',
                    versions: {
                        $push: '$$ROOT'
                    }
                }
            }
        ]).then((versions: any[]) => {
            let versionsData = versions.reduce((apps, app) => {
                let activeVersions = [];
                let latestVersion = null;
                for (let v of app.versions) {
                    if (v.latest) {
                        latestVersion = v;
                    }
                    if (v.active) {
                        activeVersions.push(v.version);
                    }
                }
                apps[app._id] = {
                    activeVersions: activeVersions,
                    latestVersion: latestVersion ? latestVersion.version : '',
                    latestVersionDescription: latestVersion ? latestVersion.description : ''
                };
                return apps;
            }, {});

            for (let app in versionsData) {
                redisClient.set('appVersions.' + app, versionsData[app]);
            }
        });

    } catch (error) {
        log.error('Error refreshing Redis Data : ', error);
    }
};



export const refreshRedisData = () => {
    refreshData();
    setInterval(() => {
        refreshData();
    }, 10000);
}