import { model } from 'mongoose';
import { getResults } from '../../helpers/query';
import { QueryObj } from '../../middlewares/query';
import { INotification } from '../../models/notification/notification';
import { SellerNotificationTypes } from '../../models/notification/notification-types';
import { IOrder } from '../../models/order/order';

const Notification = model<INotification>('Notification');
const Order = model<IOrder>('Order');

export const getNotificationsByType = async (type: string, queryObj: QueryObj, user) => {
	try {
		const turnInOrderIds = await Order.distinct('_id', {
			seller: user._id,
			'currentStatus.status': 'placed',
			'accepted.status': { $ne: true },
			'cancelled.status': { $ne: true },
			'rejected.status': { $ne: true }
		});

		const turnInTypes: SellerNotificationTypes[] = ['SELLER_SINGLE_ORDER_PLACED'];
		let dbQuery = {
			...(type === 'turn-in'
				? { type: { $in: turnInTypes }, 'data.orderId': { $in: turnInOrderIds } }
				: {}),
			userType: 'seller',
			user: user._id
		};

		const populations = [
			{
				path: 'data.orderId',
				model: 'Order',
				select: 'accepted rejected cancelled delivered returned order.totalAmt'
			}
		];

		let results = await getResults(
			{},
			Notification,
			dbQuery,
			{},
			'message',
			'createdAt',
			-1,
			10,
			populations
		);
		return results;
	} catch (error) {
		throw error;
	}
};
