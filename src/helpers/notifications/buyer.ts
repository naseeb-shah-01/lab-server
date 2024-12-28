import { ICustomer } from '../../models/customer/customer';
import { BuyerNotificationTypes } from '../../models/notification/notification-types';
import { IGroupOrder } from '../../models/order/group-order';
import { IOrder } from '../../models/order/order';
import { IUser } from '../../models/user/user';
import { formatRupee } from '../number';
import { smsTemplates } from '../sms-templates';

export const BuyerNotifications: Partial<
	Record<
		BuyerNotificationTypes,
		(data: any) => {
			type: BuyerNotificationTypes;
			data: any;
			message: string;
			sms: keyof typeof smsTemplates;
			email: boolean;
			fcm: boolean;
		}
	>
> = {
	BUYER_ACCOUNT_DISABLED: () => ({
		type: 'BUYER_ACCOUNT_DISABLED',
		sms: null,
		email: false,
		fcm: true,
		data: {},
		message: `Your Account is disabled by Admin.`
	}),
	BUYER_ACCOUNT_ENABLED: () => ({
		type: 'BUYER_ACCOUNT_ENABLED',
		sms: null,
		email: false,
		fcm: true,
		data: {},
		message: `Your Account is enabled by Admin.`
	}),
	BUYER_GROUP_ORDER_COMPLETE: (groupOrder: IGroupOrder) => ({
		type: 'BUYER_GROUP_ORDER_COMPLETE',
		sms: null,
		email: false,
		fcm: true,
		data: { groupOrder: groupOrder._id },
		message: `Your team order is completed with ${
			groupOrder.buyers
		} buyers and total of ${formatRupee(groupOrder.total)}.`
	}),
	BUYER_ORDER_PLACED: (order: IOrder) => ({
		type: 'BUYER_ORDER_PLACED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Order is placed successfully.`
	}),
	BUYER_ORDER_ACCEPTED: (data: { order: IOrder; productNames: string[]; seller: ICustomer }) => ({
		type: 'BUYER_ORDER_ACCEPTED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: data.order._id },
		message: `${data.productNames.join(', ')} accepted by ${
			data.seller.businessName || data.seller.name
		} in your order.`
	}),
	BUYER_ORDER_REJECTED: (data: { order: IOrder; productNames: string[]; seller: ICustomer }) => ({
		type: 'BUYER_ORDER_REJECTED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: data.order._id },
		message: `${data.productNames.join(', ')} rejected by ${
			data.seller.businessName || data.seller.name
		} in your order.`
	}),
	BUYER_ORDER_CANCELLED: (order: IOrder) => ({
		type: 'BUYER_ORDER_CANCELLED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Your order has been cancelled.`
	}),
	BUYER_ORDER_DISPATCHED: (data: { order: IOrder; duration: number; hasCOD: boolean }) => ({
		type: 'BUYER_ORDER_DISPATCHED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: data.order._id },
		message: `Your order is dispatched. It will reach you in 10-30 minutes.${
			data.hasCOD ? 'Please pay the COD at the time of Delivery.' : ''
		}`
	}),
	BUYER_RETURN_REQUEST: (order: IOrder) => ({
		type: 'BUYER_RETURN_REQUEST',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `We have received your return request. We will soon review it.`
	}),
	BUYER_RETURN_REQUEST_APPROVED: (order: IOrder) => ({
		type: 'BUYER_RETURN_REQUEST_APPROVED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Return request approved by admin. We will pickup the order from your delivery address soon. Please keep the package ready.`
	}),
	BUYER_RETURN_REQUEST_REJECTED: (order: IOrder) => ({
		type: 'BUYER_RETURN_REQUEST_REJECTED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Return request rejected by admin.`
	}),
	BUYER_RETURN_COMPLETED: (order: IOrder) => ({
		type: 'BUYER_RETURN_COMPLETED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Your order is returned back to seller.`
	}),
	BUYER_DELIVERY_NOT_ACCEPTED: (order: IOrder) => ({
		type: 'BUYER_DELIVERY_NOT_ACCEPTED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Order delivery was not accepted by you. We will return the order to seller.`
	}),
	BUYER_ORDER_DELIVERED: (order: IOrder) => ({
		type: 'BUYER_ORDER_DELIVERED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Order is successfully delivered to you.`
	}),

	BUYER_REFUND_INITIATED: (order: IOrder) => ({
		type: 'BUYER_REFUND_INITIATED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Refund initiated for your order. You will receive the amount in your bank account in 5-7 working days.`
	}),
	BUYER_FIRST_ORDER_DELIVERED: (order: IOrder) => ({
		type: 'BUYER_FIRST_ORDER_DELIVERED',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Yay! You received your first order! We can't wait to serve you more happiness! 🍔🍟`
	}),
	BUYER_ORDER_DELIVERED_IN_15_MINUTES: (order: IOrder) => ({
		type: 'BUYER_ORDER_DELIVERED_IN_15_MINUTES',
		sms: null,
		email: false,
		fcm: true,
		data: { orderId: order._id },
		message: `Wow! Your order was delivered in just 15 minutes! That's lightning fast!`
	}),
	BUYER_SIGNUP: () => ({
		type: 'BUYER_SIGNUP',
		sms: null,
		email: false,
		fcm: true,
		data: {},
		message: `Welcome to Quickiii!!`
	}),
	BUYER_REFERRAL_REWARD: ({ name, amount }) => ({
		type: 'BUYER_REFERRAL_REWARD',
		sms: null,
		email: false,
		fcm: true,
		data: {},
		message: `Your wallet has been credited with ${amount}. Use it in your next order. Your friend ${name}'s first order has been delivered successfully.`
	}),
	BUYER_WALLET_CREATED: (amount) => ({
		type: 'BUYER_WALLET_CREATED',
		sms: null,
		email: false,
		fcm: true,
		data: {},
		message: `Your wallet has been created with ${amount}.`
	}),
	BUYER_ORDER_ARRIVED: () => ({
		type: 'BUYER_ORDER_ARRIVED',
		sms: null,
		email: false,
		fcm: true,
		data: {},
		message: `Your order has arrived at the location. Please collect`
	}),
	BUYER_CASHBACK_RECIEVED: (amount) => ({
		type: 'BUYER_CASHBACK_RECIEVED',
		sms: null,
		email: false,
		fcm: true,
		data: {},
		message: `Your Received ${amount} Cashback on this order .`
	})
};

export const createBuyerNotification = (
	type: keyof typeof BuyerNotifications,
	buyerId: string,
	data: any
) => {
	const content: {
		type: string;
		data: any;
		message: string;
		sms: keyof typeof smsTemplates;
		email: boolean;
		fcm: boolean;
	} = BuyerNotifications[type](data);
	return {
		userType: 'buyer',
		user: buyerId,
		...content
	};
};
