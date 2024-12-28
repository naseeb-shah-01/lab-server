import { model } from 'mongoose';
import { IOrder } from '../models/order/order';
import { IGroupOrder } from '../models/order/group-order';
import { CronJob } from 'cron';
import { ICustomer } from '../models/customer/customer';

import { createBuyerNotification } from '../helpers/notifications/buyer';
import { createSellerNotification } from '../helpers/notifications/seller';
import {
	sendAdminNotification,
	sendBuyerNotification,
	sendSellerNotification
} from '../helpers/notifications/notification';
import { createAdminNotification } from '../helpers/notifications/admin';

const Order = model<IOrder>('Order');
const GroupOrder = model<IGroupOrder>('GroupOrder');
const Customer = model<ICustomer>('Customer');

export const jobs: Record<string, CronJob> = {};

export const startOrderMaturitySchedular = async () => {
	const date = new Date();
	await checkCompletedOrders(date);
	processCompletedGroupOrders();
	prepareOrdersForMaturity(date);
	new CronJob(
		'0 0 */1 * * *',
		function () {
			prepareOrdersForMaturity(new Date());
		},
		null,
		true
	);
};

const checkCompletedOrders = async (date: Date) => {
	try {
		const completedOrders = await GroupOrder.find({
			completed: false,
			endDate: { $lte: date }
		});
		if (completedOrders?.length) {
			for (let order of completedOrders) {
				completeRunningOrder(order._id.toString());
			}
		}
	} catch (error) {
		console.error('Completed orders error : ', error);
	}
};

const processCompletedGroupOrders = async () => {
	try {
		const orders = await GroupOrder.find({
			completed: true,
			processed: false
		});
		if (orders?.length) {
			for (let order of orders) {
				// Reprocess all buyer orders of this team order
				Order.find({
					groupOrder: order._id,
					'cancelled.status': false,
					'rejected.status': false
				}).then(async (orders) => {
					if (orders?.length) {
						for (let order of orders) {
							await matureSingleOrder(order);
						}
					}
					order.processed = true;
					await order.save();
				});
			}
		}
	} catch (error) {
		console.error(error);
	}
};

const prepareOrdersForMaturity = async (date: Date) => {
	try {
		const nextOrders = await GroupOrder.find({
			completed: false,
			endDate: { $gt: date }
		});
		if (nextOrders?.length) {
			for (let order of nextOrders) {
				if (!jobs[order._id.toString()]) {
					jobs[order._id.toString()] = new CronJob(
						new Date(order.endDate),
						function () {
							completeRunningOrder(order._id.toString());
							delete jobs[order._id.toString()];
						},
						null,
						true
					);
				}
			}
		}
	} catch (error) {
		console.error('Order maturity error : ', error);
	}
};

export const completeRunningOrder = async (orderId: string) => {
	try {
		// Set Team order to completed
		const order = await GroupOrder.findById(orderId);
		if (order) {
			order.completed = true;
			await order.save();
			try {
				global.io.emit('runningOrderUpdated', {
					messageID: Date.now(),
					...order.toJSON()
				});
			} catch (error) {
				console.error(error);
			}
		}
		// Clear running items from seller
		const seller = await Customer.findByIdAndUpdate(
			order.seller,
			{
				$set: {
					runningItems: []
				}
			},
			{ useFindAndModify: false }
		);
		sendGroupOrderCompleteNotifications(order, seller);

		// Complete all buyer orders of this team order
		Order.find({
			groupOrder: order._id,
			'cancelled.status': false,
			'rejected.status': false
		}).then(async (orders) => {
			if (orders?.length) {
				for (let sorder of orders) {
					await matureSingleOrder(sorder);
					sendBuyerGroupOrderNotifications(order, sorder.buyer.toString());
				}
			}
			order.processed = true;
			await order.save();
		});
	} catch (error) {
		console.error('Complete running order error : ', error);
	}
};

export const matureSingleOrder = async (order: IOrder) => {
	try {
		// Update maturity status of single order
		order.matured = {
			status: true,
			date: new Date()
		};
		const seller = await Customer.findById(order.seller);
		const invoiceNumber = seller.sellerInvoiceNumber || 1;
		seller.sellerInvoiceNumber = (seller.sellerInvoiceNumber || 1) + 1;
		await seller.save();
		order.invoiceNumber = invoiceNumber;
		await order.save();
	} catch (error) {
		console.error('Single order mature error : ', error);
	}
};

const sendGroupOrderCompleteNotifications = async (groupOrder: IGroupOrder, seller: ICustomer) => {
	try {
		const sellerNotification = createSellerNotification(
			'SELLER_GROUP_ORDER_COMPLETED',
			groupOrder.seller.toString(),
			groupOrder
		);
		sendSellerNotification(sellerNotification);
	} catch (error) {
		console.error(error);
	}
	try {
		const adminNotification = createAdminNotification('ADMIN_ORDER_MATURED', null, {
			groupOrder,
			seller
		});
		sendAdminNotification(adminNotification);
	} catch (error) {
		console.error(error);
	}
};

const sendBuyerGroupOrderNotifications = async (groupOrder, buyerId: string) => {
	try {
		const buyerNotification = createBuyerNotification(
			'BUYER_GROUP_ORDER_COMPLETE',
			buyerId.toString(),
			groupOrder
		);
		sendBuyerNotification(buyerNotification);
	} catch (error) {
		console.error(error);
	}
};
