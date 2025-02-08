import { throwError } from '../../helpers/throw-errors';
import { IPatient } from '../../models/general/patient';

import { model } from 'mongoose';

const Patient = model<IPatient>('Patient');

export const createPatient = async (data: IPatient) => {
    try {
        const patient = await Patient.create(data);

        return patient
    } catch (error) {
        throw error;
    }
};

export const updatePatient = async (data: any) => {
    try {
        const { id } = data;
        if (!id) {
            throwError(400, 'Please provide id');
        }
        const update = await Patient.updateOne(
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
export const getPatient = async (id: string) => {
    try {
        if (!id) {
            throwError(400, 'Please provide id');
        }
        const patient = await Patient.findById(id);
        return patient
    } catch (error) {
        throw error;
    }
};
