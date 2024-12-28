import { QueryObj } from '../../middlewares/query';
import { IUser } from '../../models/user/user';
import { model } from 'mongoose';
import {
	getSkip,
	getLimit,
	getSearch,
	IListResponse,
	getPage,
	getSort,
	deletePrivateProps
} from '../../helpers/query';
import { usersListQuery } from './user-query';
import { throwError } from '../../helpers/throw-errors';
import { checkAndUpdateSessions, removeSessions } from './session';
const User = model<IUser>('User');

export const getUsers = async (queryObj: QueryObj): Promise<IListResponse> => {
	try {
		let sort = getSort(queryObj, 'name', 1);
		let skip = getSkip(queryObj, 15);
		let page = getPage(queryObj);
		let limit = getLimit(queryObj, 15);
		let search = getSearch(queryObj);
		let filterType = queryObj.filterType;
		let filterValue = queryObj.filterValue;

		let userIds = null;

		let result = null;
		let total: any = await User.aggregate(
			usersListQuery(search, '', true, sort, skip, limit, userIds, filterType)
		);
		if (total && total.length && total[0].total) {
			result = await User.aggregate(
				usersListQuery(search, '', false, sort, skip, limit, userIds, filterType)
			);
		} else {
			result = await User.aggregate(
				usersListQuery('', search, false, sort, skip, limit, userIds, filterType)
			);
		}
		let results = [];
		if (result.length) {
			result = result[0];
			if (result.metadata && result.metadata.length && result.metadata[0].total) {
				total = result.metadata[0].total;
			} else {
				total = 0;
			}
			if (result.results) {
				results = result.results;
			}
		}

		return {
			data: results,
			total: total,
			limit: limit,
			sort: Object.keys(sort)[0] || '',
			order:
				sort[Object.keys(sort)[0]] === 'asc' || sort[Object.keys(sort)[0]] === 1
					? 'asc'
					: 'desc',
			page: page,
			search: search
		};
	} catch (error) {
		throw error;
	}
};

export const getUserById = async (id: string) => {
	try {
		const user = await User.findById(id)
			.select({
				firstName: 1,
				middleName: 1,
				lastName: 1,
				contact: 1,
				email: 1,
				address: 1,
				dob: 1,
				avatar: 1
			})
			.lean();
		if (!user) {
			throwError(404);
		}
		return user;
	} catch (error) {
		throw error;
	}
};

export const addUser = async (data: IUser, user) => {
	try {
		data = deletePrivateProps(data);
		if (!data.contact || !data.email || !data.firstName) {
			throwError(400);
		}
		await checkExistingUsers(data);
		data.createdBy = data.updatedBy = user ? user._id : null;
		const newUser = new User(data);
		let savedUser: any = await newUser.save();
		savedUser = savedUser.toJSON();
		delete savedUser.password;
		return savedUser;
	} catch (error) {
		throw error;
	}
};

export const updateUser = async (id: string, data: IUser, user) => {
	try {
		data = deletePrivateProps(data);
		delete data.fcmTokens;
		delete data.sessions;

		if (data.contact || data.email) {
			await checkExistingUsers(data, id);
		}

		data.updatedBy = user ? user._id : null;
		let updatedUser = await User.findByIdAndUpdate(
			id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();
		if (!updatedUser) {
			throwError(404);
		}
		updatedUser = await checkAndUpdateSessions(JSON.parse(JSON.stringify(updatedUser))); // asynchronously update user sessions
		updatedUser = deleteUserPrivateProps(updatedUser);
		return updatedUser;
	} catch (error) {
		throw error;
	}
};

export const deleteUser = async (id, user) => {
	try {
		let deletedUser = await User.findOneAndUpdate(
			{
				_id: id,
				admin: { $ne: true }
			},
			{
				$set: {
					status: 'deleted',
					updatedBy: user ? user._id : null
				}
			},
			{
				new: true,
				useFindAndModify: false
			}
		).lean();
		if (!deletedUser) {
			throwError(404);
		}

		deletedUser = await removeSessions(deletedUser);
		deleteUserPrivateProps(deletedUser);
		return deletedUser;
	} catch (error) {
		throw error;
	}
};

const checkExistingUsers = async (data: IUser, exception?: string) => {
	const existingUsers = await User.find({
		status: 'active',
		$or: [
			...(data.contact
				? [
						{
							contact: data.contact
						}
				  ]
				: []),
			...(data.email
				? [
						{
							email: data.email
						}
				  ]
				: [])
		],
		_id: { $ne: exception }
	}).lean();
	if (existingUsers.length) {
		let contactMatched = false;
		let emailMatched = false;
		for (const user of existingUsers) {
			if (
				data.contact &&
				user.contact.toString().trim().toString() ===
					data.contact.toString().trim().toString()
			) {
				contactMatched = true;
			}
			if (data.email && user.email === data.email.trim()) {
				emailMatched = true;
			}
		}
		throwError(
			409,
			(contactMatched ? 'Contact Number ' : '') +
				(contactMatched && emailMatched ? 'and ' : '') +
				(emailMatched ? 'Email ' : '') +
				'already exists',
			'DATA_CONFLICT'
		);
	}
};

const deleteUserPrivateProps = (user) => {
	delete user.password;
	delete user.fcmTokens;
	delete user.status;
	delete user.sessions;
	delete user.otp;
	return user;
};
