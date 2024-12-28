import { ICustomer } from '../../models/customer/customer';
import { ISeller } from '../../models/customer/seller';
import { AdminNotificationTypes } from '../../models/notification/notification-types';
import { IGroupOrder } from '../../models/order/group-order';
import { IOrder } from '../../models/order/order';
import { IProduct } from '../../models/seller/product';
import { smsTemplates } from '../sms-templates';

export const AdminNotifications: Partial<
	Record<
		AdminNotificationTypes,
		(data: any) => {
			type: AdminNotificationTypes;
			data: any;
			message: string;
			sms: keyof typeof smsTemplates;
			email: boolean;
			socket: boolean;
		}
	>
> = {
	ADMIN_USER_REGISTERED: (customer: ICustomer) => ({
		type: 'ADMIN_USER_REGISTERED',
		sms: null,
		email: false,
		socket: true,
		data: { customerId: customer._id },
		message: `New user registered. Contact ${customer.contact}`
	}),
	ADMIN_SELLER_APPROVAL: (seller: ICustomer) => ({
		type: 'ADMIN_SELLER_APPROVAL',
		sms: null,
		email: true,
		socket: true,
		data: { sellerId: seller._id },
		message: `Seller approval required for ${seller.businessName}`
	}),
	ADMIN_NEW_BUYER: (buyer: ICustomer) => ({
		type: 'ADMIN_NEW_BUYER',
		sms: null,
		email: true,
		socket: true,
		data: { buyerId: buyer._id },
		message: `New buyer ${buyer.businessName} completed KYC`
	}),

	ADMIN_SINGLE_TURN_IN_REQUEST: (order: IOrder) => ({
		type: 'ADMIN_SINGLE_TURN_IN_REQUEST',
		sms: null,
		email: true,
		socket: true,
		data: {
			orderId: order._id,
			buyer: (order.buyer as ICustomer)._id.toString(),
			seller: (order.seller as ISeller)._id.toString()
		},
		message: `New Order Placed. Seller: ${(order.seller as ISeller).businessName} Buyer: ${
			(order.buyer as ICustomer).name
		} Regards, Team Quickiii [By Aekatr Technology and Services]`
	}),
	ADMIN_GROUP_TURN_IN_REQUEST: (order: IOrder) => ({
		type: 'ADMIN_GROUP_TURN_IN_REQUEST',
		sms: 'adminNotification',
		email: true,
		socket: true,
		data: {
			orderId: order._id,
			buyer: (order.buyer as ICustomer)._id.toString(),
			seller: (order.seller as ISeller)._id.toString()
		},
		message: `New Turn In request. Seller: ${(order.seller as ISeller).businessName} Buyer: ${
			(order.buyer as ICustomer).businessName
		} Order type: Group Regards, Covnine Team`
	}),
	ADMIN_ORDER_DISPATCHED: (order: IOrder) => ({
		type: 'ADMIN_ORDER_DISPATCHED',
		sms: 'adminDispatch',
		email: true,
		socket: true,
		data: { orderId: order._id },
		message: `Order dispatched by seller: ${
			(order.seller as ISeller).businessName
		}. Regards, Covnine Team`
	}),
	ADMIN_TURN_IN: (data: { order: IOrder; productNames: string[]; seller: ICustomer }) => ({
		type: 'ADMIN_TURN_IN',
		sms: null,
		email: false,
		socket: true,
		data: { orderId: data.order._id },
		message: `${data.productNames.join(', ')} turned in by ${
			data.seller.businessName || data.seller.name
		}`
	}),
	ADMIN_TURN_IN_REJECTED: (data: {
		order: IOrder;
		productNames: string[];
		seller: ICustomer;
	}) => ({
		type: 'ADMIN_TURN_IN_REJECTED',
		sms: null,
		email: true,
		socket: true,
		data: { orderId: data.order._id },
		message: `${data.productNames.join(', ')} rejected by ${
			data.seller.businessName || data.seller.name
		}`
	}),
	ADMIN_ORDER_CANCELLED: (data: { order: IOrder; buyer: ICustomer }) => ({
		type: 'ADMIN_ORDER_CANCELLED',
		sms: null,
		email: true,
		socket: true,
		data: { orderId: data.order._id },
		message: `Order cancelled by ${data.buyer.businessName || data.buyer.name}`
	}),
	ADMIN_ORDER_RETURN_REQUEST: (data: { order: IOrder; buyer: ICustomer }) => ({
		type: 'ADMIN_ORDER_RETURN_REQUEST',
		sms: null,
		email: true,
		socket: true,
		data: { orderId: data.order._id },
		message: `Return Requested by ${data.buyer.businessName || data.buyer.name}`
	}),
	ADMIN_ORDER_MATURED: (data: { groupOrder: IGroupOrder; seller: ICustomer }) => ({
		type: 'ADMIN_ORDER_MATURED',
		sms: null,
		email: false,
		socket: true,
		data: { groupOrderId: data.groupOrder._id },
		message: `Running order completed for ${data.seller.businessName || data.seller.name}`
	}),
	ADMIN_PRICE_TABLE_UPDATED: (seller: ICustomer) => ({
		type: 'ADMIN_PRICE_TABLE_UPDATED',
		sms: null,
		email: false,
		socket: true,
		data: { sellerId: seller._id },
		message: `Price table updated by ${seller.businessName || seller.name}`
	}),
	ADMIN_PRODUCT_DISABLED: (data: { seller: ICustomer; product: IProduct }) => ({
		type: 'ADMIN_PRODUCT_DISABLED',
		sms: null,
		email: false,
		socket: true,
		data: { sellerId: data.seller._id, productId: data.product._id },
		message: `Product ${data.product.name || ''} disabled by ${
			data.seller.businessName || data.seller.name
		}`
	}),
	ADMIN_PRODUCT_DELETED: (data: { seller: ICustomer; product: IProduct }) => ({
		type: 'ADMIN_PRODUCT_DELETED',
		sms: null,
		email: false,
		socket: true,
		data: { sellerId: data.seller._id, productId: data.product._id },
		message: `Product ${data.product.name || ''} deleted by ${
			data.seller.businessName || data.seller.name
		}`
	}),
	ADMIN_PRODUCT_ENABLED: (data: { seller: ICustomer; product: IProduct }) => ({
		type: 'ADMIN_PRODUCT_ENABLED',
		sms: null,
		email: false,
		socket: true,
		data: { sellerId: data.seller._id, productId: data.product._id },
		message: `Product ${data.product.name || ''} enabled by ${
			data.seller.businessName || data.seller.name
		}`
	})
};

export const createAdminNotification = (
	type: keyof typeof AdminNotifications,
	adminId: string,
	data: any
) => {
	const content: {
		type: string;
		data: any;
		message: string;
		sms: keyof typeof smsTemplates;
		email: boolean;
		socket: boolean;
	} = AdminNotifications[type](data);
	return {
		userType: 'admin',
		user: adminId,
		...content
	};
};
