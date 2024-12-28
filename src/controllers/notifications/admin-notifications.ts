import { model, Types } from 'mongoose';
import { getResults } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { QueryObj } from '../../middlewares/query';
import { INotification } from '../../models/notification/notification';
import {
	AdminNotificationTypes,
	NotificationTypes
} from '../../models/notification/notification-types';
import { ISeller } from '../../models/customer/seller';
import { IWhatsapp } from '../../models/whatsapp/whatsappMessage';

const Notification = model<INotification>('Notification');
const Seller = model<ISeller>('NewCustomer');
const WhatsApp = model<IWhatsapp>('Whatsapp');
const ObjectId = Types.ObjectId;

const adminNotificationTypes: Record<string, AdminNotificationTypes[]> = {
	'seller-approval': ['ADMIN_SELLER_APPROVAL'],
	'new-buyers': ['ADMIN_NEW_BUYER'],
	'turn-in-request': ['ADMIN_SINGLE_TURN_IN_REQUEST', 'ADMIN_GROUP_TURN_IN_REQUEST'],
	'turn-in-rejected': ['ADMIN_TURN_IN_REJECTED'],
	'order-matured': ['ADMIN_ORDER_MATURED'],
	'dispatch-ready': ['ADMIN_ORDER_DISPATCHED'],
	cancelled: ['ADMIN_ORDER_CANCELLED'],
	returns: ['ADMIN_ORDER_RETURN_REQUEST']
};

export const getAllNotificationsByType = async (status: string, queryObj: QueryObj, user) => {
	try {
		const dbQuery: any = {
			clear: status === 'cleared',
			user: user._id,
			userType: 'admin'
		};

		if (status !== 'cleared') {
			if (status === 'other') {
				dbQuery.type = {
					$nin: Object.values(adminNotificationTypes).reduce(
						(all, i) => [...all, ...i],
						[]
					)
				};
			} else {
				if (!adminNotificationTypes[status]) {
					throwError(400);
				}
				dbQuery.type = {
					$in: adminNotificationTypes[status]
				};
			}
		}

		let results = await getResults(
			queryObj,
			Notification,
			dbQuery,
			{},
			'message',
			'createdAt',
			1,
			15
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const getNotificationCounts = async (user) => {
	try {
		let allNotificationCounts = await Notification.aggregate([
			{
				$match: {
					userType: 'admin',
					clear: false,
					user: ObjectId(user._id)
				}
			},
			{
				$group: {
					_id: '$type',
					typeCount: { $sum: 1 }
				}
			},
			{
				$project: {
					_id: 0,
					type: '$_id',
					typeCount: 1
				}
			}
		]);

		const notificationCounts = {};
		for (let key in adminNotificationTypes) {
			notificationCounts[key] = 0;

			for (let type of adminNotificationTypes[key]) {
				notificationCounts[key] +=
					allNotificationCounts.find((notification) => notification.type === type)
						?.typeCount || 0;
			}
		}
		notificationCounts['other'] =
			allNotificationCounts
				.filter(
					(notification) =>
						!Object.values(adminNotificationTypes)
							.reduce((all, i) => [...all, ...i], [])
							.includes(notification.type)
				)
				.reduce((total, noti) => total + noti.typeCount, 0) || 0;

		return notificationCounts;
	} catch (error) {
		throw error;
	}
};

export const clearNotificationById = async (id: string, user) => {
	try {
		const notification = await Notification.findById(id);

		if (!notification) {
			throwError(404);
		}

		notification.clear = true;
		notification.updatedBy = user._id || null;
		await notification.save();

		return notification.toJSON();
	} catch (error) {
		throw error;
	}
};

export const clearAllNotificationByType = async (type: string, user) => {
	try {
		const filter: any = {
			clear: false,
			user: user._id,
			userType: 'admin'
		};

		if (type === 'other') {
			filter.type = {
				$nin: Object.values(adminNotificationTypes).reduce((all, i) => [...all, ...i], [])
			};
		} else {
			if (!adminNotificationTypes[type]) {
				throwError(400);
			}
			filter.type = {
				$in: adminNotificationTypes[type]
			};
		}

		const notifications = await Notification.updateMany(filter, {
			$set: {
				clear: true,
				updatedBy: user._id
			}
		});
		return notifications;
	} catch (error) {
		throw error;
	}
};

//show blink
export const showMiscellaneousCounts = async () => {
	try {
		const pendingSellerApprovalCount = await Seller.countDocuments({
			approved: false,
			kyc: true
		});
		const unreadWhatsappSmsCount = await WhatsApp.countDocuments({ unread: true });

		const result = {
			pendingSellerApprovalCount,
			unreadWhatsappSmsCount
		};
		return result;
	} catch (error) {
		throw error;
	}
};
