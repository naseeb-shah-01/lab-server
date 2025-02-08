import { throwError } from '../../helpers/throw-errors';
import { ITest } from '../../models/general/test';

import { model } from 'mongoose';

const Test = model<ITest>('Test');

export const createTest = async (data: ITest) => {
	try {
		let group = await Test.create(data);
		return group;
	} catch (e) {
		throw e;
	}
};

export const getTestById = async (id: string) => {
	try {
		if (!id) {
			throwError(400, 'Please Provide test Id');
		}

		const result = await Test.findById(id).lean();
		return result;
	} catch (error) {
		throw error;
	}
};
export const testByGroupId = async (groupId: string) => {
	try {
		if (!groupId) {
			throwError(400, 'Please Provide Test Group Id');
		}

		let result = await Test.find({ group: groupId }).lean();
		return result;
	} catch (error) {
		throw error;
	}
};
export const updateTests = async (tests: ITest[]) => {
	try {
		if (!Array.isArray(tests) || tests.length === 0) {
			return throwError(400, ' Invalid input, array expected');
		}

		const updatedTests = await Promise.all(
			tests.map(async (test) => {
				if (!test._id) {
					throwError(400, 'Test ID is required');
				}

				return await Test.findByIdAndUpdate(test._id, test, { new: true });
			})
		);

		return { message: 'Tests updated successfully', data: updatedTests };
	} catch (error) {
		console.error('Error updating tests:', error);
		throw error;
	}
};


 export const getAllTest=async()=>{
    try {
        
        let result= await Test.find()
        return result
    } catch (error) {
        throw error
    }
}