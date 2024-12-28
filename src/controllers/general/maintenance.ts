import { Types, model } from 'mongoose';
import { IMaintenance } from '../../models/general/maintenance';
import { throwError } from '../../helpers/throw-errors';
import { deletePrivateProps } from '../../helpers/query';
const ObjectId = Types.ObjectId;
const Maintenance = model<IMaintenance>('Maintenance');

export const getAllAppsMaintenance = async () => {
    try {
        let maintenances = await Maintenance.find({
            status: 'active'
        });
        return maintenances;
    } catch (error) {
        throw error;
    }
};

export const getAppMaintenance = async (appName: string) => {
    try {
        if (!appName) {
            throwError(400);
        }
        appName = appName.trim();
        let maintenance = await Maintenance.findOne({
            status: 'active',
            appName: appName
        });
        if (!maintenance) {
            throwError(404);
        }
        return maintenance;
    } catch (error) {
        throw error;
    }
};

export const addAppMaintenance = async (data: IMaintenance) => {
    try {
        data = deletePrivateProps(data);
        if (!data.appName) {
            throwError(400);
        }
        data.appName = data.appName.trim();
        let existingMaintenance = await Maintenance.findOne({
            status: 'active',
            appName: data.appName
        });
        if (existingMaintenance) {
            throwError(409, 'Already exists', 'DATA_CONFLICT');
        }
        let maintenance = new Maintenance({
            appName: data.appName
        });
        await maintenance.save();
        return maintenance;
    } catch (error) {
        throw error;
    }
}

export const updateAppNameMaintenance = async (appName: string, data: IMaintenance) => {
    try {
        data = deletePrivateProps(data);
        if (!appName || !data.appName) {
            throwError(400);
        }
        appName = appName.trim();
        data.appName = data.appName.trim();
        let maintenance = await Maintenance.findOne({
            status: 'active',
            appName: appName
        });
        if (!maintenance) {
            throwError(404);
        }
        let existingMaintenance = await Maintenance.findOne({
            status: 'active',
            appName: data.appName
        });
        if (existingMaintenance) {
            throwError(409, 'Another App with same name already exists', 'DATA_CONFLICT');
        }
        maintenance.appName = data.appName;
        await maintenance.save();
        return maintenance;
    } catch (error) {
        throw error;
    }
}

export const deleteAppMaintenance = async (appName: string) => {
    try {
        if (!appName) {
            throwError(400);
        }
        appName = appName.trim();
        let maintenance = await Maintenance.findOne({
            status: 'active',
            appName: appName
        });
        if (!maintenance) {
            throwError(404);
        }
        maintenance.status = 'deleted';
        await maintenance.save();
        return maintenance;
    } catch (error) {
        throw error;
    }
};

export const updateAppMaintenance = async (appName: string, status: string) => {
    try {
        if (!appName || !(status === 'enable' || status === 'disable')) {
            throwError(400);
        }
        appName = appName.trim();
        let maintenance = await Maintenance.findOne({
            status: 'active',
            appName: appName
        });
        if (!maintenance) {
            throwError(404);
        }
        maintenance.maintenance = status === 'enable' ? true : false;
        await maintenance.save();
        return maintenance;
    } catch (error) {
        throw error;
    }
}

