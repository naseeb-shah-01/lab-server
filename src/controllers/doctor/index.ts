import { throwError } from '../../helpers/throw-errors';
import { IDoctor } from '../../models/general/doctor';

import { model } from 'mongoose';

const Doctor = model<IDoctor>('Doctor');

export const createDoctor = async (data: IDoctor) => {
    try {
        const doctor = await Doctor.create(data);

        return doctor
    } catch (error) {
        throw error;
    }
};

export const updateDoctor = async (data: any) => {
    try {
        const { id } = data;
        if (!id) {
            throwError(400, 'Please provide id');
        }
        const update = await Doctor.updateOne(
            { _id: id },
            {
                $set: {
                    ...data
                }
            }
        );
        return update;
    } catch (error) {
        throw error;
    }
};
export const getDoctor = async (id: string) => {
    try {
        if (!id) {
            throwError(400, 'Please provide id');
        }
        const doctor = await Doctor.findById(id);
        return doctor
    } catch (error) {
        throw error;
    }
};
