import { RiderNotificationTypes } from '../../models/notification/notification-types';
import { smsTemplates } from '../sms-templates';

export const RiderNotifications: Partial<
	Record<
		RiderNotificationTypes,
		(data: any) => {
			type: RiderNotificationTypes;
			data: any;
			message: string;
			sms: keyof typeof smsTemplates;
			email: boolean;
			fcm: boolean;
		}
	>
> = {
	RIDER_ORDER_RECEIVED: (order) => ({
		type: 'RIDER_ORDER_RECEIVED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `New order arrived.`,
		android_channel_id: 'notification_channel'
	}),
	RIDER_ORDER_CANCELLED: (order) => ({
		type: 'RIDER_ORDER_CANCELLED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Order has been cancelled.`
	}),
	RIDER_ORDER_TRANSFER: (order) => ({
		type: 'RIDER_ORDER_TRANSFER',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Order has been transfer.`
	}),
	RIDER_SUBMIT_FLOATING_CASH: () => ({
		type: 'RIDER_SUBMIT_FLOATING_CASH',
		sms: null,
		email: false,
		fcm: true,
		data: null,
		message: `You have reached the limit of  max cash. Please submit cash nearest Point.`
	}),
	ON_RIDER_SUBMIT_FLOATING_CASH: (amount) => ({
		type: 'ON_RIDER_SUBMIT_FLOATING_CASH',
		sms: null,
		email: false,
		fcm: true,
		data: null,
		message: `Dear Rider Cash Amount ${amount} Successfully Deposted.`
	})
};

export const createRiderNotification = (
	type: keyof typeof RiderNotifications,
	riderId: string,
	data: any
) => {
	const content: {
		type: string;
		data: any;
		message: string;
		sms: keyof typeof smsTemplates;
		email: boolean;
		fcm: boolean;
	} = RiderNotifications[type](data);
	return {
		userType: 'rider',
		user: riderId,
		...content
	};
};
