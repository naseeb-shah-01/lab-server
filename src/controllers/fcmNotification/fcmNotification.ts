import { model } from 'mongoose';
import { throwError } from '../../helpers/throw-errors';
import { IScheduleNotification } from '../../models/fcmNotification/fcmNotification';
import {
	sendFCMNotification,
	sendPersonalizeNotification,
	sendPushNotification
} from '../../helpers/notifications/fcm';

import { IAreas } from '../../models/locations/goodAreas';
import { QueryObj } from '../../middlewares/query';
import { getResults } from '../../helpers/query';


// import { fcm_notification_queue } from "../../models/fcmNotification/fcmNotification";

const ScheduledNotification = model<IScheduleNotification>('fcm_notification_queue');
// const Customer = model<ICustomer>('Customer');
// const GoodAreas = model<IAreas>('Areas');
// const Cart = model<ICart>('Cart');
// const NewProduct = model<IProduct>('NewProduct');
export const saveScheduledNotification = async (data: any) => {
	try {
		const scheduledNotification = new ScheduledNotification(data);

		await scheduledNotification.save();

		return scheduledNotification;
	} catch (error) {
		throwError(error);
	}
};

export const getAllScheduleNotification = async (queryObj: QueryObj) => {
	try {
		const dbQuery: any = {};

		const dbProject: any = {};

		const results = await getResults(
			queryObj,
			ScheduledNotification,
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

export const updateStatus = async (id: string, status: string) => {
	try {
		let update = await ScheduledNotification.updateOne(
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
	} catch (err) {
		throwError(err);
	}
};

export const notificationDetails = async (id: string) => {
	try {
		let msg = await ScheduledNotification.findOne({
			_id: id
		}).lean();

		if (!msg) {
			throwError(400);
		}

		return msg;
	} catch (error) {
		throwError(401);
	}
};

export const updateScheduleNotification = async (data: any) => {
	try {
		if (!data) {
			throwError(400);
		}
		let update = await ScheduledNotification.updateOne(
			{
				_id: data._id
			},
			{
				$set: data
			}
		);
		return update;
	} catch (error) {
		throwError(500);
	}
};

export const sendScheduledNotification = async (messageData: any) => {
	try {
		if (!messageData) {
			return;
		}
		let {
			content,
			title,
			status,
			sendStatus,
			messageType,
			image,
			testNumber,
			testFCM,
			filterCustomer,
			type,
			userType,
			sellerId
		} = messageData;

		if (status === 'inactive') {
			return;
		}

		const notification = {
			title,
			message: content,
			image,
			type,
			userType,
			data: {
				sellerId
			}
		};

		if (sendStatus === 'pending' && messageType === 'test') {
			let fcmTokens;
			if (testNumber) {
				const customer: any = {}
				fcmTokens = customer.fcmTokens;
			} else {
				fcmTokens = [testFCM];
			}
			const res: any = await sendPushNotification(notification, fcmTokens);
			if (res ?? res.successCount) {
				return res.successCount;
			}
		}

		if (sendStatus === 'pending' && messageType === 'final') {
			if (filterCustomer) {
				const { filterBy, dateRange, deliveredOrders, area, foodOrders } = filterCustomer;
				 
				if ([].length > 0) {
					const res: any = await sendPushNotification(notification, []);
					if (res ?? res.successCount) {
						return res.successCount;
					}
				} else {
					return 0;
				}
			}
		}

		if (sendStatus === 'pending' && messageType === 'cart') {
			
			return {}
		}
	} catch (error) {
		console.error('Error in message:', error.message);
		throw new Error(error);
	}
};

//helper function to find buyers

