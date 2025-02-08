import { throwError } from '../../helpers/throw-errors';
import { IDoctor } from '../../models/general/doctor';
import { ILab } from '../../models/general/lab';
import { IPatient } from '../../models/general/patient';
import { IReport } from '../../models/general/report';

import { model } from 'mongoose';

const Report = model<IReport>('Report');
const Doctor = model<IDoctor>('Doctor');
const Patient = model<IPatient>('Patient');
const Lab = model<ILab>('Lab');

export const createReport = async (data: IReport) => {
	try {
		if (!data.doctor || !data.patient || !data.lab) {
			throwError(400, 'Please provide all details');
		}

		const doctor = Doctor.findById(data.doctor);
		const patient = Patient.findById(data.patient);
		const lab = Lab.findById(data.lab);
		if (!lab) return throwError(400, 'Lab not Found');
		if (!patient) return throwError(400, 'Patient not Found');
		if (!doctor) return throwError(400, 'Doctor not Found');
		const report = await Report.create(data);

		return report;
	} catch (error) {
		throw error;
	}
};

export const updateReport = async (data: any) => {
	try {
		const { id } = data;
		if (!id) {
			throwError(400, 'Please provide id');
		}
		const update = await Report.updateOne(
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
export const getReport = async (id: string) => {
	try {
		if (!id) {
			throwError(400, 'Please provide id');
		}
		const lab = await Report.findById(id);
		return lab;
	} catch (error) {
		throw error;
	}
};
