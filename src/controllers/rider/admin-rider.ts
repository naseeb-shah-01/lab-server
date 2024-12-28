import { model } from 'mongoose';
import { getResults } from '../../helpers/query';
import { QueryObj } from '../../middlewares/query';
import { IRider } from '../../models/rider/rider';
import { IAttendance } from '../../models/rider/workingHours';

import { throwError } from '../../helpers/throw-errors';
import { IOrder } from '../../models/order/order';
import { IVersion } from '../../models/general/version';

const Rider = model<IRider>('Rider');
const Attendance = model<IAttendance>('Attendance');
const Order = model<IOrder>('Order');
const Version = model<IVersion>('Version');

export const getRiders = async (queryObj: QueryObj) => {
	try {
		const dbQuery: any = {
			kyc: true,
			approved: true
		};

		const dbProject: any = {
			name: 1,
			status: 1,
			contact: 1,
			approved: 1,
			available: 1,
			kyc: 1,
			activeOrders: 1,
			floatingCash: 1,
			rating: 1,
			latestLocation: 1,
			createdAt: 1
		};

		const results = await getResults(
			queryObj,
			Rider,
			dbQuery,
			dbProject,
			'name',
			'name',
			1,
			15
		);

		return results;
	} catch (error) {
		throw error;
	}
};

//
export const updateRider = async (data, user) => {
	try {
		if (!user?._id) {
			throwError(401);
		}
		for (let rider of data) {
			await Rider.updateOne(
				{
					_id: rider._id
				},
				{
					$set: {
						name: rider.name,
						contact: +rider.contact,
						floatingCash: +rider.floatingCash
					}
				}
			);
		}
	} catch (err) {
		throwError(err);
	}
};

export const updateRiderStatus = async (id, status, user) => {
	try {
		if (user._id) {
			throwError(405);
		}
		let updateRider = await Rider.updateOne(
			{
				_id: id
			},
			{
				$set: {
					status: status
				}
			}
		);
		return;
	} catch (err) {}
};

export const riderDetails = async (id) => {
	try {
		let rider = await Rider.findOne({
			_id: id
		})
			.populate({
				path: 'activeOrders',
				populate: {
					path: 'seller buyer'
				}
			})
			.lean();
		if (!rider) {
			throwError(505);
		}

		const today = new Date();
		const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8);

		let attendance: any = await Attendance.findOne({
			riderId: id,
			createdAt: { $gte: startOfToday }
		}).populate({
			path: 'rejctedOrders',
			populate: {
				path: 'seller buyer'
			}
		});

		if (!attendance) {
			attendance = {};
		}

		return { ...rider, attendance };
	} catch (e) {
		throwError(e);
	}
};

export const updateRiderDetails = async (data, user) => {
	try {
		let updateRider = await Rider.updateOne(
			{ _id: data._id },
			{
				$set: data
			}
		);
		return updateRider;
	} catch (e) {
		throwError(503);
	}
};

export const getReviews = async (id: string, queryObj: QueryObj) => {
	try {
		if (!id) {
			return;
		}

		const dbQuery: any = {
			rider: id,
			'delivered.status': true
		};

		const dbProject: any = {
			status: 1,
			sellerDetails: 1,
			buyerDetails: 1,
			rating: 1,
			delivered: 1,
			createdAt: 1
		};

		const results = await getResults(
			queryObj,
			Order,
			dbQuery,
			dbProject,
			'name',
			'name',
			1,
			15
		);

		return results;
	} catch (error) {
		throwError(503);
	}
};

export const getRiderAppDetails = async () => {
	try {
		const riderApp = await Version.findOne({ latest: true, appName: 'rider-mobile' });
		return riderApp;
	} catch (error) {
		throwError(error);
	}
};

export const updateRiderMaxPerOrder = async (data: any) => {
	try {
		const { _id, maxOrderPerRider } = data;
		const updatedApp = await Version.findOneAndUpdate(
			{ _id },
			{ 'metadata.maxOrderPerRider': +maxOrderPerRider },
			{ new: true }
		);

		if (!updatedApp) {
			throw new Error('Document not found');
		}
		return updatedApp;
	} catch (error) {
		throw error;
	}
};
