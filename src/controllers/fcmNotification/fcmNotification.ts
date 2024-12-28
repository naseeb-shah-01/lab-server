import { model } from 'mongoose';
import { throwError } from '../../helpers/throw-errors';
import { IScheduleNotification } from '../../models/fcmNotification/fcmNotification';
import {
	sendFCMNotification,
	sendPersonalizeNotification,
	sendPushNotification
} from '../../helpers/notifications/fcm';
import { ICustomer } from '../../models/customer/customer';
import { IAreas } from '../../models/locations/goodAreas';
import { QueryObj } from '../../middlewares/query';
import { getResults } from '../../helpers/query';
import { ICart } from '../../models/customer/cart';
import { IProduct } from '../../models/seller/product';
// import { fcm_notification_queue } from "../../models/fcmNotification/fcmNotification";

const ScheduledNotification = model<IScheduleNotification>('fcm_notification_queue');
const Customer = model<ICustomer>('Customer');
const GoodAreas = model<IAreas>('Areas');
const Cart = model<ICart>('Cart');
const NewProduct = model<IProduct>('NewProduct');
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
				const customer: any = await Customer.findOne({ contact: testNumber });
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
				const buyerListFcm = await filterCustomerByCriteria(
					filterBy,
					dateRange,
					foodOrders,
					deliveredOrders,
					area
				);
				let sentMsgCount = 0;
				if (buyerListFcm.length > 0) {
					const res: any = await sendPushNotification(notification, buyerListFcm);
					if (res ?? res.successCount) {
						return res.successCount;
					}
				} else {
					return sentMsgCount;
				}
			}
		}

		if (sendStatus === 'pending' && messageType === 'cart') {
			const res: any = await filterCustomerByCart();
			return res;
		}
	} catch (error) {
		console.error('Error in message:', error.message);
		throw new Error(error);
	}
};

//helper function to find buyers
export const filterCustomerByCriteria = async (
	filterBy: String,
	dateRange: any,
	foodOrders: any,
	deliveredOrders,
	area: String
) => {
	let buyerListFcm = [];
	let startingDate: Date;
	let endingDate: Date;
	if (dateRange) {
		const { startDate, endDate } = dateRange;
		startingDate = startDate;
		endingDate = endDate;
	}
	let buyers;
	if (filterBy === 'createdAt') {
		buyers = await Customer.find({
			createdAt: { $gte: new Date(startingDate), $lte: new Date(endingDate) },
			DND: false
		});
	} else if (filterBy === 'deliveredOrders') {
		buyers = await Customer.aggregate([
			{
				$match: {
					createdAt: {
						$gte: new Date(startingDate),
						$lte: new Date(endingDate)
					}
				}
			},
			{
				$lookup: {
					from: 'orders',
					let: { buyerId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: { $eq: ['$buyer', '$$buyerId'] },
								'currentStatus.status': 'delivered'
							}
						}
					],
					as: 'orders'
				}
			},
			{
				$match: {
					[`orders.${+deliveredOrders - 1}`]: { $exists: true }
				}
			}
		]);
	} else if (filterBy === 'area') {
		const goodArea: any = await GoodAreas.findOne({ _id: area });
		buyers = await Customer.find({
			latestLocation: {
				$geoWithin: {
					$geometry: goodArea.loc
				}
			}
		});
	} else if (filterBy === 'foodOrders') {
		buyers = await Customer.aggregate([
			{
				$lookup: {
					from: 'orders',
					localField: '_id',
					foreignField: 'buyer',
					as: 'orders'
				}
			},
			{ $unwind: '$orders' },
			{
				$match: {
					'orders.commission.restaurantGst': { $gt: 0 }
				}
			}
		]);
	}

	// Push the last element of fcm array from each buyer into buyerListFcm
	buyers.forEach((buyer) => {
		if (buyer.fcmTokens.length > 0) {
			buyerListFcm.push(buyer.fcmTokens[buyer.fcmTokens.length - 1]);
		}
	});

	return buyerListFcm;
};

//helper function find buyer have cart
export const filterCustomerByCart = async () => {
	try {
		const buyerIdsWithItemsInCart = await Cart.distinct('buyer');
		const goodArea: any = await GoodAreas.findOne({ _id: '6486c39101e3f183af3f2e54' });

		const buyers = await Customer.find({
			_id: { $in: buyerIdsWithItemsInCart },
			latestLocation: {
				$geoWithin: {
					$geometry: goodArea.loc
				}
			}
		}).limit(1000);

		let sendNotificationCount = 0;

		for (let buyer of buyers) {
			const buyerDetails = await Customer.findById(buyer._id);
			let buyerName = buyerDetails?.name ?? '';
			let buyerFCM = buyerDetails?.fcmTokens[buyerDetails.fcmTokens.length - 1] ?? '';
			const cart: any = await Cart.findOne({ buyer: buyer._id });
			const seller = cart.seller;
			const product = await NewProduct.findOne({ _id: cart.product });
			const productName = product?.name ?? '';
			const result: any = await sendPersonalizeNotification(
				productName,
				buyerName,
				buyerFCM,
				seller
			);
			if (result && result.successCount === 1) {
				sendNotificationCount++;
			}
		}

		return sendNotificationCount;
	} catch (error) {
		throwError(error);
	}
};
