import { ICustomer } from '../../models/customer/customer';
import { SellerNotificationTypes } from '../../models/notification/notification-types';
import { IGroupOrder } from '../../models/order/group-order';
import { IOrder } from '../../models/order/order';
import { IRider } from '../../models/rider/rider';
import { IProduct } from '../../models/seller/product';
import { formatRupee, tf2 } from '../number';
import { smsTemplates } from '../sms-templates';
import { model, Types } from 'mongoose';

const Rider = model<IRider>('Rider');

export const SellerNotifications: Partial<
	Record<
		SellerNotificationTypes,
		(data: any) => {
			type: SellerNotificationTypes;
			data: any;
			message: string;
			socket: boolean;
			sms: keyof typeof smsTemplates;
			email: boolean;
			fcm: boolean;
		}
	>
> = {
	SELLER_ACCOUNT_DISABLED: () => ({
		type: 'SELLER_ACCOUNT_DISABLED',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: {},
		message: `Your account is disabled by Admin.`
	}),
	SELLER_ACCOUNT_ENABLED: () => ({
		type: 'SELLER_ACCOUNT_ENABLED',
		sms: null,
		email: false,
		fcm: true,
		socket: true,
		data: {},
		message: `Your account is enabled by Admin.`
	}),
	SELLER_ACCOUNT_APPROVED: () => ({
		type: 'SELLER_ACCOUNT_APPROVED',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: {},
		message: `Your seller account is approved by Admin, start selling your products now.`
	}),
	SELLER_PRICE_TABLE_UPDATED: () => ({
		type: 'SELLER_PRICE_TABLE_UPDATED',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: {},
		message: `Your price table is updated by Admin.`
	}),
	SELLER_PRODUCT_DISABLED: (product: IProduct) => ({
		type: 'SELLER_PRODUCT_DISABLED',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: { product: product._id },
		message: `Your product ${product.name || ''} is disabled by Admin.`
	}),
	SELLER_PRODUCT_ENABLED: (product: IProduct) => ({
		type: 'SELLER_PRODUCT_ENABLED',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: { product: product._id },
		message: `Your product ${product.name || ''} is enabled by Admin.`
	}),
	SELLER_GROUP_ORDER_COMPLETED: (groupOrder: IGroupOrder) => ({
		type: 'SELLER_GROUP_ORDER_COMPLETED',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: {
			groupOrderId: groupOrder._id,
			total: groupOrder.total
		},
		message: `Team Order has Completed with ${
			groupOrder.buyers
		} buyers and total order of ${formatRupee(groupOrder.total)}.`
	}),
	SELLER_GROUP_ORDER_STARTED: (groupOrder: IGroupOrder) => ({
		type: 'SELLER_GROUP_ORDER_STARTED',
		sms: null,
		socket: true,
		email: false,
		fcm: true,
		data: {
			groupOrderId: groupOrder._id
		},
		message: `New Team Order has started for next ${
			groupOrder.duration >= 24
				? `${tf2(groupOrder.duration / 24)} days`
				: `${groupOrder.duration} hours`
		}.`
	}),
	SELLER_WARNING_ORDER_PLACED: (order: IOrder) => ({
		type: 'SELLER_WARNING_ORDER_PLACED',
		sms: null,
		socket: false,
		email: false,
		fcm: true,
		data: {
			orderId: order._id,
			total: order.order.totalAmt
		},
		message: `An order is still waiting for your confirmation, Please confirm your Order`,
		android_channel_id: 'notification_channel',
		sound: 'siren.wav'
	}),
	SELLER_SINGLE_ORDER_PLACED: (order: IOrder) => ({
		type: 'SELLER_SINGLE_ORDER_PLACED',
		sms: 'sellerNotification',
		email: false,
		socket: true,
		fcm: true,
		data: {
			orderId: order._id,
			total: order.order.totalAmt
		},
		message: `New order #${order._id
			.toString()
			.slice(-5)
			.toUpperCase()} received on QUICKIII! Please review and confirm for fulfilment. Regards, Team Quickiii [By Aekatr Technology and Services]`,
		android_channel_id: 'notification_channel',
		sound: 'siren.wav'
	}),
	SELLER_GROUP_ORDER_PLACED: (order: IOrder) => ({
		type: 'SELLER_GROUP_ORDER_PLACED',
		sms: 'sellerNotification',
		email: false,
		fcm: true,
		socket: true,
		data: {
			orderId: order._id,
			total: order.order.totalAmt
		},
		message: `New team order placed on Aekatra. Turn In Now ! Regards, Covnine Team`,
		android_channel_id: 'notification_channel',
		sound: 'siren.wav'
	}),
	SELLER_FIRST_ORDER_DELIVERED: (order: IOrder) => ({
		type: 'SELLER_FIRST_ORDER_DELIVERED',
		sms: null,
		email: false,
		fcm: true,
		socket: true,
		data: { orderId: order._id },
		message: `first order delivered`
	}),
	SELLER_ORDER_CANCELLED: (order: IOrder) => ({
		type: 'SELLER_ORDER_CANCELLED',
		sms: null,
		email: false,
		fcm: true,
		socket: true,
		data: { orderId: order._id },
		message: `Order has been cancelled.`
	}),
	SELLER_RETURN_REQUEST: (data: { order: IOrder; buyer: ICustomer }) => ({
		type: 'SELLER_RETURN_REQUEST',
		sms: null,
		email: false,
		fcm: true,
		socket: true,
		data: { orderId: data.order._id },
		message: `Return requested by Buyer ${data.buyer.businessName || data.buyer.name}.`
	}),
	SELLER_RETURN_APPROVED: (order: IOrder) => ({
		type: 'SELLER_RETURN_APPROVED',
		sms: null,
		email: false,
		fcm: true,
		socket: true,
		data: { orderId: order._id },
		message: `Return approved by Admin`
	}),
	SELLER_RETURN_REJECTED: (order: IOrder) => ({
		type: 'SELLER_RETURN_REJECTED',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: { orderId: order._id },
		message: `Return rejected by Admin`
	}),
	SELLER_RETURN_PICKED_UP: (order: IOrder) => ({
		type: 'SELLER_RETURN_PICKED_UP',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: { orderId: order._id },
		message: `Return picked up by courier`
	}),
	SELLER_ORDER_RETURNED: (order: IOrder) => ({
		type: 'SELLER_ORDER_RETURNED',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: { orderId: order._id },
		message: `Order is returned to you`
	}),
	SELLER_DELIVERY_NOT_ACCEPTED: (data: { order: IOrder; buyer: ICustomer }) => ({
		type: 'SELLER_DELIVERY_NOT_ACCEPTED',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: { orderId: data.order._id },
		message: `Delivery not accepted by Buyer ${data.buyer.businessName || data.buyer.name}`
	}),
	SELLER_ORDER_DELIVERED: (data: { order: IOrder; buyer: ICustomer }) => ({
		type: 'SELLER_ORDER_DELIVERED',
		sms: null,
		email: false,
		fcm: true,
		socket: true,
		data: { orderId: data.order._id },
		message: `Order delivered to Buyer ${data.buyer.businessName || data.buyer.name}`
	}),
	SELLER_RIDER_APPROVAL: (rider: IRider) => ({
		type: 'SELLER_RIDER_APPROVAL',
		sms: null,
		email: false,
		socket: true,
		fcm: true,
		data: { riderId: rider._id },
		message: `Your rider ${rider.name} is awaiting approval`
	}),
	SELLER_REFERRAL_CREATED: (amount) => ({
		type: 'SELLER_REFERRAL_CREATED',
		sms: null,
		email: false,
		fcm: true,
		socket: true,
		data: {},
		message: ` You discount created with ${amount}.`
	}),
	SELLER_REFERRAL_REWARD: ({ name, amount }) => ({
		type: 'SELLER_REFERRAL_REWARD',
		sms: null,
		email: false,
		fcm: true,
		socket: true,
		data: {},
		message: ` You discount created with ${amount} ,use in your next order. You friend ${name}  first order delivered successfully.`
	}),
	SELLER_ORDER_CANCELLED_RIDER: (order: IOrder) => ({
		type: 'SELLER_ORDER_CANCELLED_RIDER',
		sms: null,
		email: false,
		fcm: true,
		socket: true,
		data: { orderId: order._id },
		message: `Order has been cancelled due to Rider unavailability`
	}),
	SELLER_ORDER_NEW_RIDER_ASSIGN: (order: IOrder) => ({
		type: 'SELLER_ORDER_NEW_RIDER_ASSIGN',
		sms: null,
		email: false,
		fcm: true,
		socket: true,
		data: { orderId: order._id },
		message: `Order has been transfer  to new Rider`
	})
};

export const createSellerNotification = (
	type: keyof typeof SellerNotifications,
	sellerId: string,
	data: any
) => {
	const content: {
		type: string;
		data: any;
		message: string;
		sms: keyof typeof smsTemplates;
		email: boolean;
		socket: boolean;
		fcm: boolean;
	} = SellerNotifications[type](data);
	return {
		userType: 'seller',
		user: sellerId,
		...content
	};
};
