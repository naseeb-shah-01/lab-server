import { throwError } from '../../helpers/throw-errors';
import { IGroup } from '../../models/general/testGroup';
import { ITest } from '../../models/general/test';

import { model } from 'mongoose';

const Test = model<ITest>('Test');

const Group = model<IGroup>('Group');

export const createTestGroup = async (data: IGroup) => {
	try {
		if (!data.type || !data.name || !data.note) {
			return throwError(400);
		}
		let group = await Group.create(data);
		return group;
	} catch (e) {
		throw e;
	}
};

export const updateGroup = async (data: IGroup) => {
	try {
		const { id } = data;
		const updatedGroup = await Group.updateOne(
			{
				_id: id
			},
			{
				$set: {
					...data
				}
			}
		);
		return updateGroup;
	} catch (error) {
		throw error;
	}
};
