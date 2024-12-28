import { Types, model } from 'mongoose';
import { IVersion } from '../../models/general/version';
import { throwError } from '../../helpers/throw-errors';
import { deletePrivateProps } from '../../helpers/query';
const ObjectId = Types.ObjectId;
const Version = model<IVersion>('Version');

export const getAllAppsVersions = async () => {
    try {
        let versions = await Version.find({
            status: 'active'
        }).sort({ appName: 1, version: -1, latest: -1 });
        return versions;
    } catch (error) {
        throw error;
    }
};

export const getAppVersions = async (appName: string, onlyActive: any = 'true') => {
    try {
        if (!appName) {
            throwError(400);
        }
        appName = appName.trim();
        let versions = await Version.find({
            status: 'active',
            appName: appName,
            ...(onlyActive === 'true' ? { active: true } : {})
        }).sort({ version: -1, latest: -1 });
        return versions;
    } catch (error) {
        throw error;
    }
};

export const getAppVersion = async (appName: string, versionName: string) => {
    try {
        if (!appName || !versionName) {
            throwError(400);
        }
        appName = appName.trim();
        versionName = versionName.trim();
        let version = await Version.findOne({
            status: 'active',
            appName: appName,
            version: versionName
        });
        if (!version) {
            throwError(404);
        }
        return version;
    } catch (error) {
        throw error;
    }
};

export const getAppLatestVersion = async (appName: string) => {
    try {
        if (!appName) {
            throwError(400);
        }
        appName = appName.trim();
        let version = await Version.findOne({
            status: 'active',
            appName: appName,
            latest: true
        });
        if (!version) {
            throwError(404);
        }
        return version;
    } catch (error) {
        throw error;
    }
};

export const addAppVersion = async (appName: string, data: IVersion) => {
    try {
        data = deletePrivateProps(data);
        if (!appName || !data.version) {
            throwError(400);
        }
        data.appName = appName.trim();
        data.version = data.version.trim();
        if (data.description) {
            data.description = data.description.trim();
        }
        if (data.latest) {
            throwError(409, 'Setting latest not allowed when creating version', 'DATA_CONFLICT');
        }
        let existingVersion = await Version.findOne({
            status: 'active',
            appName: data.appName,
            version: data.version
        });
        if (existingVersion) {
            throwError(409, 'Already exists', 'DATA_CONFLICT');
            throw {
                status: 409,
                error: 'Already exists',
                errorCode: 'DATA_CONFLICT'
            };
        }
        let version = new Version(data);
        await version.save();
        return version;
    } catch (error) {
        throw error;
    }
}

export const updateAppVersion = async (appName: string, versionName: string, data: IVersion) => {
    try {
        data = deletePrivateProps(data);
        if (!appName || !versionName || !(data.version || data.appName || data.description)) {
            throwError(400);
        }
        appName = appName.trim();
        versionName = versionName.trim();
        if (data.version) {
            data.version = data.version.trim();
        }
        if (data.appName) {
            data.appName = data.appName.trim();
        }
        if (data.description) {
            data.description = data.description.trim();
        }
        let version = await Version.findOne({
            status: 'active',
            appName: appName,
            version: versionName
        });
        if (!version) {
            throwError(404);
        }
        if ((data.version && versionName !== data.version) || (data.appName && appName !== data.appName)) {
            let existingVersion = await Version.findOne({
                status: 'active',
                appName: data.appName ? data.appName : appName,
                version: data.version ? data.version : versionName,
            });
            if (existingVersion) {
                throwError(409, 'Version already exists', 'DATA_CONFLICT');
            }
        }

        if (data.version) {
            version.version = data.version;
        }
        if (data.appName) {
            version.appName = data.appName;
        }
        if (data.description) {
            version.description = data.description;
        }
        await version.save();
        return version;
    } catch (error) {
        throw error;
    }
}

export const updateAppVersionStatus = async (appName: string, versionName: string, status: string) => {
    try {
        if (!appName || !versionName || !(status === 'latest' || status === 'old' || status === 'expired')) {
            throwError(400);
        }
        appName = appName.trim();
        versionName = versionName.trim();
        let version = await Version.findOne({
            status: 'active',
            appName: appName,
            version: versionName
        });
        if (!version) {
            throwError(404);
        }
        switch (status) {
            case 'latest':
                await Version.updateMany({
                    appName: appName,
                    latest: true
                }, {
                    $set: {
                        latest: false
                    }
                });
                version.active = true;
                version.latest = true;
                await version.save();
                break;
            case 'old':
                version.active = true;
                version.latest = false;
                await version.save();
                break;
            case 'expired':
                version.active = false;
                version.latest = false;
                await version.save();
                break;
            default:
                break;
        }
        return version;
    } catch (error) {
        throw error;
    }
};

export const deleteAppVersions = async (appName: string) => {
    try {
        if (!appName) {
            throwError(400);
        }
        appName = appName.trim();
        let result = await Version.updateMany({
            status: 'active',
            appName: appName
        }, {
            $set: {
                status: 'deleted'
            }
        });
        return result;
    } catch (error) {
        throw error;
    }
};

export const deleteAppVersion = async (appName: string, versionName: string) => {
    try {
        if (!appName || !versionName) {
            throwError(400);
        }
        appName = appName.trim();
        versionName = versionName.trim();
        let version = await Version.findOne({
            status: 'active',
            appName: appName,
            version: versionName
        });
        if (!version) {
            throwError(404);
        }
        version.status = 'deleted';
        await version.save();
        return version;
    } catch (error) {
        throw error;
    }
};

