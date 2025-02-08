import { throwError } from '../../helpers/throw-errors';
import { ILab } from '../../models/general/lab';

import { model } from 'mongoose';

const Lab = model<ILab>('Lab');

export const createLab = async (data: ILab) => {
	try {
		const lab = await Lab.create( data );

		return lab;
	} catch (error) {
		throw error;
	}
};

export const updateLab = async (data: any) => {
	try {
		const { id } = data;
		if (!id) {
			throwError(400, 'Please provide id');
		}
		const update = await Lab.updateOne(
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
export const getLab = async (id: string) => {
	try {
		if (!id) {
			throwError(400, 'Please provide id');
		}
		const lab = await Lab.findById(id);
		return lab;
	} catch (error) {
		throw error;
	}
};
