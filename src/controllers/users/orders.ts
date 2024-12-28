import { model, Types } from 'mongoose';
import { tf0, tf2 } from '../../helpers/number';
import differenceInMinutes from 'date-fns/differenceInMinutes';
import { getLimit, getPage, getSearch, getSkip, getSort } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { QueryObj } from '../../middlewares/query';
import { IGroupOrder } from '../../models/order/group-order';
import { IOrder, OrderStatus } from '../../models/order/order';
import { orderListQuery, runningOrdersListQuery } from './order-query';
import PaytmChecksum from 'paytmchecksum';
import config from '../../../config.json';
import { dispatchOrders } from '../seller/orders';

import { IRider } from '../../models/rider/rider';
import { createBuyerNotification } from '../../helpers/notifications/buyer';
import {
	sendBuyerNotification,
	sendRiderNotification,
	sendSellerNotification
} from '../../helpers/notifications/notification';
import { createSellerNotification } from '../../helpers/notifications/seller';
import { ICustomer } from '../../models/customer/customer';
import { ISeller } from '../../models/customer/seller';
import axios, { AxiosRequestConfig } from 'axios';
import { removeOrders } from '../../helpers/removeOrders';
import { minDistance } from '../../helpers/haversineDistance';
import { blockCODOrderOfRider, riderCarryMaxCash } from '../rider/rider';
import { createRiderNotification } from '../../helpers/notifications/rider';
import {
	addIncentiveAndEarnings,
	calculateEarningOnOrderReturn,
	notifyOrderStatusUpdate,
	probabilisticNumber,
	setDeliveryAddressPrimary
} from '../rider/orders';
import { getStripText } from '../../helpers/strip-text';
import { checkNextOrderRiderAvailable } from '../customers/order';
import { IHistory } from '../../models/general/history';
import { getDistanceWithGoogle } from '../../helpers/calculateDistance';

const Order = model<IOrder>('Order');
const Rider = model<IRider>('Rider');
const GroupOrder = model<IGroupOrder>('GroupOrder');
const Customer = model<ICustomer>('Customer');
const Seller = model<ISeller>('NewCustomer');
const ObjectId = Types.ObjectId;
const History = model<IHistory>('History');
export const getAllOrders = async (status: string, queryObj: QueryObj) => {
	try {
		let sort = getSort(queryObj, 'name', 1);
		let skip = getSkip(queryObj, 15);
		let page = getPage(queryObj);
		let limit = getLimit(queryObj, 15);
		let search = getSearch(queryObj);

		let result = null;

		let total = 0;
		if (status !== 'running') {
			result = await Order.aggregate(
				orderListQuery(search, false, sort, skip, limit, status)
			);
		} else {
			result = await GroupOrder.aggregate(runningOrdersListQuery(search, sort, skip, limit));
		}
		let results = [];
		if (result.length) {
			result = result[0];
			if (result.metadata && result.metadata.length && result.metadata[0].total) {
				total = result.metadata[0].total;
			} else {
				total = 0;
			}
			if (result.results) {
				results = result.results;
			}
		}

		return {
			data: results,
			total: total,
			limit: limit,
			sort: Object.keys(sort)[0] || '',
			order:
				sort[Object.keys(sort)[0]] === 'asc' || sort[Object.keys(sort)[0]] === 1
					? 'asc'
					: 'desc',
			page: page,
			search: search
		};
	} catch (error) {
		throw error;
	}
};

export const getOrdersCounts = async () => {
	try {
		const countStatuses: OrderStatus[] = [
			'placed',
			'accepted',
			'dispatch',
			'rider_accepted',
			'ready',
			'arrived',
			'not_received',
			'return_requested',
			'return_accepted',
			'return_pickup'
		];
		let ordersCounts = await Order.aggregate([
			{
				$match: {
					status: { $ne: 'deleted' },
					'currentStatus.status': {
						$in: countStatuses
					}
				}
			},
			{
				$group: {
					_id: '$currentStatus.status',
					statusCount: {
						$sum: {
							$cond: {
								if: {
									$and: [
										{ $eq: ['$isGroupOrder', true] },
										{ $eq: ['$currentStatus.status', 'accepted'] }
									]
								},
								then: {
									$cond: {
										if: { $eq: ['$matured.status', true] },
										then: 1,
										else: 0
									}
								},
								else: 1
							}
						}
					}
				}
			},
			{
				$project: {
					_id: 0,
					status: '$_id',
					statusCount: 1
				}
			}
		]);

		let ordersCountsObj = {};
		for (let o of ordersCounts) {
			ordersCountsObj[o.status] = o.statusCount;
		}
		let runningOrdersCounts = await GroupOrder.find({ completed: false }).countDocuments();
		ordersCountsObj['running'] = runningOrdersCounts || 0;

		return ordersCountsObj;
	} catch (error) {
		throw error;
	}
};

export const cashSettlement = async (user: IRider, order: IOrder) => {
	let rider = await Rider.findById(user._id).select('floatingCash');
	if (!rider) {
		throwError(404);
	}
	let cashSubmitedId = rider._id.toString().slice(-5);

	return {
		cash: rider?.floatingCash || 0,
		cashSubmitedId
	};
};
export const cashSettlementOnDelivery = async (user: IRider, order: IOrder) => {
	if (order) {
		let collectedAmount =
			order.order.totalAmt +
			order.deliveryMode.charges -
			(order?.walletUse || 0) -
			(order?.rewardUse || 0) -
			(order.onlinePayment.status.find((statusObj) => statusObj.status === 'completed')
				? order.onlinePayment.amount
				: 0);

		await Rider.findByIdAndUpdate(user._id, {
			$inc: { floatingCash: collectedAmount }
		});
	}

	let cash = await Rider.findById(user._id).select('floatingCash');

	if (!cash?.floatingCash) {
		return 0;
	}
	if (+cash.floatingCash >= +riderCarryMaxCash) {
		await blockCODOrderOfRider([user._id]);
		const riderNotification = createRiderNotification(
			'RIDER_SUBMIT_FLOATING_CASH',
			user._id.toString(),
			null
		);
		sendRiderNotification(riderNotification);
	}
	return cash.floatingCash;
};
export function randomNumberBetween30and40() {
	return Math.floor(Math.random() * (20 - 10 + 1) + 10);
}

export const mangeReferral = async (code, customername) => {
	let referenceCustomer = await Customer.findOne({ 'referral.mycode': code });

	if (referenceCustomer && referenceCustomer.referral.limit > referenceCustomer.referral.count) {
		let amount = randomNumberBetween30and40();
		try {
			const buyerNotification = createBuyerNotification(
				'BUYER_REFERRAL_REWARD',
				referenceCustomer?._id,
				{ name: customername, amount: amount }
			);
			sendBuyerNotification(buyerNotification);
		} catch (error) {
			console.error(error);
		}
		referenceCustomer.rewardBalance += amount;

		await History.create({
			type: 'reward',
			buyer: referenceCustomer._id,
			amount: amount,
			date: new Date(),
			action: 'credit',
			remark: 'Referral CashBack'
		});
		referenceCustomer.referral.count += 1;
		await referenceCustomer.save();
	}
	return;
};

export function randomNumberBetween10and50() {
	return Math.floor(Math.random() * 9 + 1) * 5 + 5;
}

export const manageSellerReferral = async (code, sellername) => {
	let referenceSeller = await Seller.findOne({ 'referral.mycode': code });

	if (referenceSeller) {
		let amount = randomNumberBetween10and50();
		try {
			const sellerNotification = createSellerNotification(
				'SELLER_REFERRAL_REWARD',
				referenceSeller?._id,
				{ name: sellername, amount: amount }
			);
			sendBuyerNotification(sellerNotification);
		} catch (error) {
			console.error(error);
		}
		referenceSeller.referredDiscount = amount;
		await referenceSeller.save();
	}
	return;
};

export const changeOrderStatus = async (id: string, status: OrderStatus, data: any, user) => {
	try {
		const checkStatuses: OrderStatus[] = [
			'returned',
			'not_received',
			'delivered',
			'return_rejected',
			'return_accepted',
			'return_pickup',
			'abandoned',
			'ready',
			'return_pickup',
			'arrived'
		];
		let order = await Order.findById(id).populate('coupon');
		if (!order) {
			throwError(404);
		}

		const rider = await Rider.findById(order.rider);

		let distance = 0;
		let customer, orderCompeletdTime;
		customer = await Customer.findOne({ _id: order.buyer });
		if (!customer) {
			throwError(404);
		}

		if (!checkStatuses.includes(status)) {
			throwError(402);
		}

		let seller = await Seller.findById(order.seller);

		let newStatus = {
			status: status as OrderStatus,
			date: new Date(),
			by: user._id,
			remarks: (data?.remarks as string) || null
		};

		if (status == 'arrived') {
			let { longitude, latitude } = data;
			order.arrived.status = true;
			order.arrived.date = new Date();
			order.arrived.location = {
				type: 'Point',
				coordinates: [longitude, latitude]
			};

			try {
				const buyerNotification = createBuyerNotification(
					'BUYER_ORDER_ARRIVED',
					(order.buyer as ICustomer)._id.toString(),
					order
				);
				sendBuyerNotification(buyerNotification);
			} catch (error) {
				console.error(error);
			}
		}

		if (status === 'returned') {
			order.returned.status = true;
			order.returned.date = new Date();
			order.returned.remarks = data?.remarks;
			seller.orders.returned = seller.orders.returned + 1;
			await calculateEarningOnOrderReturn(order);

			await sendReturnedNotifications(order._id.toString());
			if (order?.walletUse || order?.rewardUse) {
				customer.balance += order.walletUse;
				customer.rewardBalance += order.rewardUse;

				if (order?.walletUse) {
					await History.create({
						type: 'wallet',
						buyer: order.buyer,
						amount: order?.walletUse,
						date: new Date(),
						action: 'credit',
						remark: `Order Returned: ${order._id}`
					});
				}
				if (order.rewardUse) {
					await History.create({
						type: 'reward',
						buyer: order.buyer,
						amount: order.rewardUse,
						date: new Date(),
						action: 'credit',
						remark: `Order Returned: ${order._id}`
					});
				}
			}
			if (order.paymentMode == 'online') {
				let IsPaymentSuccess = order.onlinePayment.status.findIndex(
					(status) => status.status === 'completed'
				);
				if (IsPaymentSuccess) {
					customer.balance += order.onlinePayment.amount;
					await History.create({
						type: 'wallet',
						buyer: order.buyer,
						amount: order.onlinePayment.amount,
						date: new Date(),
						action: 'credit',
						remark: `Order Returned: ${order._id}`
					});
				}
			}
			await removeOrders(order);
		} else if (status === 'not_received') {
			order.notReceived.status = true;
			order.notReceived.date = new Date();
			sendNotReceivedNotifications(order._id.toString());
			seller.orders.not_received = seller.orders.not_received + 1;
		} else if (status === 'delivered') {
			order.delivered.status = true;
			let riderCash = await cashSettlementOnDelivery(user, order);
			let deliveryStatus = checkNextOrderRiderAvailable();
			setDeliveryAddressPrimary(
				customer,
				order?.buyerDetails?.shippingAddress?.googlePlaceId
			);
			if (!deliveryStatus) {
				global.io.emit('isDeliveryAvailable', {
					available: false,
					text: getStripText()
				});
			}
			if (order?.coupon?.cashback) {
				let amount = probabilisticNumber(order?.coupon?.cashback);
				customer.rewardBalance += amount;
				await History.create({
					type: 'reward',
					buyer: order.buyer,
					amount: order.rewardUse,
					date: new Date(),
					action: 'credit',
					remark: `CashBack Received: ${order._id}`
				});

				const buyerNotification = createBuyerNotification(
					'BUYER_CASHBACK_RECIEVED',
					(order.buyer as ICustomer)._id.toString(),
					amount
				);
				sendBuyerNotification(buyerNotification);
			}

			addIncentiveAndEarnings(order);
			orderCompeletdTime = differenceInMinutes(new Date(), order.accepted.date);
			if (orderCompeletdTime < 16) {
				try {
					const buyerNotification = createBuyerNotification(
						'BUYER_ORDER_DELIVERED_IN_15_MINUTES',
						(order.buyer as ICustomer)._id.toString(),
						order
					);
					sendBuyerNotification(buyerNotification);
				} catch (error) {
					console.error(error);
				}

				if (customer?.orderCount?.delivered == 0) {
					try {
						if (customer.referral.usedcode) {
							await mangeReferral(customer.referral.usedcode, customer.name);
						}
						const buyerNotification = createBuyerNotification(
							'BUYER_FIRST_ORDER_DELIVERED',
							(order.buyer as ICustomer)._id.toString(),
							order
						);

						seller.orders.delivered = seller.orders.delivered + 1;
						sendBuyerNotification(buyerNotification);
					} catch (error) {
						console.error(error);
					}
				}
				seller.orders.delivered = seller.orders.delivered + 1;
			}

			order.delivered.date = new Date();
			let arriveToDelivery = differenceInMinutes(order.delivered.date, order.arrived.date);
			if (arriveToDelivery > 10) {
				customer.codBlock += 1;
			}

			customer.orderCount = {
				total: customer?.orderCount?.total,
				delivery: (customer?.orderCount?.delivery || 0) + 1,

				pending: customer?.orderCount?.pending - 1
			};
			seller.orders.delivered = seller.orders.delivered + 1;
			sendDeliveredNotifications(order._id.toString());
			await removeOrders(order);
		} else if (status === 'return_accepted') {
			seller.orders.return_accepted = seller.orders.return_accepted + 1;
			order.returnRequest.approved.status = true;

			order.returnRequest.approved.date = new Date();

			sendReturnApprovedNotifications(order._id.toString());
		} else if (status === 'return_rejected') {
			order.returnRequest.rejected.status = true;
			order.returnRequest.rejected.date = new Date();
			seller.orders.return_rejected = seller.orders.return_rejected + 1;
			sendReturnRejectedNotifications(order._id.toString());
		}
		// else if (status === 'return_pickup') {
		// 	order.returnPickup.status = true;
		// 	order.returnPickup.date = new Date();
		// 	seller.orders.return_pickup = seller.orders.return_pickup + 1;

		// 	sendReturnPickupNotifications(order._id.toString());
		// }
		else if (status === 'abandoned') {
			order.abandoned.status = true;
			order.abandoned.date = new Date();
			seller.orders.abandoned = seller.orders.abandoned + 1;
		}

		if (status !== 'return_rejected') {
			order.currentStatus = newStatus;
		} else {
			order.currentStatus = order.statusHistory.find((st) => st.status === 'delivered');
		}
		if (!order.statusHistory.some((st) => st.status === status)) {
			order.statusHistory.push(newStatus);
		}
		if (status == 'ready') {
			order.ready.status = true;
			order.ready.date = new Date();
		}

		await order.save();
		await seller.save();
		await customer.save();
		// Send order status change notification to seller
		notifyOrderStatusUpdate(seller._id, order.rider);

		return order;
	} catch (error) {
		throw error;
	}
};
export const sendReturnApprovedNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId);
		try {
			const buyerNotification = createBuyerNotification(
				'BUYER_RETURN_REQUEST_APPROVED',
				order.buyer.toString(),
				order
			);
			sendBuyerNotification(buyerNotification);
		} catch (error) {
			console.error(error);
		}
		try {
			const sellerNotification = createSellerNotification(
				'SELLER_RETURN_APPROVED',
				order.seller.toString(),
				order
			);
			sendSellerNotification(sellerNotification);
		} catch (error) {
			console.error(error);
		}
	} catch (error) {
		console.error(error);
	}
};

export const sendReturnRejectedNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId);
		try {
			const buyerNotification = createBuyerNotification(
				'BUYER_RETURN_REQUEST_REJECTED',
				order.buyer.toString(),
				order
			);
			sendBuyerNotification(buyerNotification);
		} catch (error) {
			console.error(error);
		}
		try {
			const sellerNotification = createSellerNotification(
				'SELLER_RETURN_REJECTED',
				order.seller.toString(),
				order
			);
			sendSellerNotification(sellerNotification);
		} catch (error) {
			console.error(error);
		}
	} catch (error) {
		console.error(error);
	}
};

export const sendReturnPickupNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId);

		const sellerNotification = createSellerNotification(
			'SELLER_RETURN_PICKED_UP',
			order.seller.toString(),
			order
		);
		sendSellerNotification(sellerNotification);
	} catch (error) {
		console.error(error);
	}
};

export const sendReturnedNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId);
		try {
			const buyerNotification = createBuyerNotification(
				'BUYER_RETURN_COMPLETED',
				order.buyer.toString(),
				order
			);
			sendBuyerNotification(buyerNotification);
		} catch (error) {
			console.error(error);
		}
		try {
			const sellerNotification = createSellerNotification(
				'SELLER_ORDER_RETURNED',
				order.seller.toString(),
				order
			);
			sendSellerNotification(sellerNotification);
		} catch (error) {
			console.error(error);
		}
	} catch (error) {
		console.error(error);
	}
};

export const sendNotReceivedNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId).populate('buyer', 'name businessName');
		try {
			const buyerNotification = createBuyerNotification(
				'BUYER_DELIVERY_NOT_ACCEPTED',
				(order.buyer as ICustomer)._id.toString(),
				order
			);
			sendBuyerNotification(buyerNotification);
		} catch (error) {
			console.error(error);
		}
		try {
			const sellerNotification = createSellerNotification(
				'SELLER_DELIVERY_NOT_ACCEPTED',
				order.seller.toString(),
				{ order, buyer: order.buyer }
			);
			sendSellerNotification(sellerNotification);
		} catch (error) {
			console.error(error);
		}
	} catch (error) {
		console.error(error);
	}
};

export const sendDeliveredNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId).populate('buyer', 'name businessName');
		try {
			const buyerNotification = createBuyerNotification(
				'BUYER_ORDER_DELIVERED',
				(order.buyer as ICustomer)._id.toString(),
				order
			);
			sendBuyerNotification(buyerNotification);
		} catch (error) {
			console.error(error);
		}
		try {
			const sellerNotification = createSellerNotification(
				'SELLER_ORDER_DELIVERED',
				order.seller.toString(),
				{ order, buyer: order.buyer }
			);
			sendSellerNotification(sellerNotification);
		} catch (error) {
			console.error(error);
		}
	} catch (error) {
		console.error(error);
	}
};

export const getGroupOrderById = async (id: string) => {
	try {
		let groupOrder = await GroupOrder.findById(id).populate(
			'seller',
			'addresses name businessName contact'
		);
		if (!groupOrder) {
			throwError(404);
		}
		let orders = await Order.find({
			groupOrder: groupOrder._id,
			'accepted.status': true
		})
			.select({
				buyerDetails: {
					name: 1
				},
				order: 1,
				currentStatus: 1
			})
			.lean();
		return { ...groupOrder.toJSON(), orders };
	} catch (error) {
		throw error;
	}
};

export const refundOrder = async (id: string, data: { refundAmount: number }, user: any) => {
	try {
		if (!(data?.refundAmount >= 1)) {
			throwError(400);
		}

		const order = await Order.findById(id);
		if (!order) {
			throwError(404);
		}
		if (order.onlinePayment?.amount - (order.refund?.amount || 0) < data.refundAmount) {
			throwError(419);
		}
		if (!order.refund) {
			order.refund = { amount: 0 };
		}
		order.refund.amount = tf2((order.refund?.amount || 0) + data.refundAmount);
		order.refund.date = new Date();
		order.refund.completed = true;
		order.refund.by = user._id;
		order.refund.remarks = 'Amount : ' + data.refundAmount;
		const newStatus = {
			status: 'refund_completed' as OrderStatus,
			date: new Date(),
			remarks: 'Amount : ' + data.refundAmount,
			by: user._id
		};
		order.statusHistory.push(newStatus);
		let paytmParams: any = {};

		paytmParams.body = {
			mid: config.paytm.paytm_mid,
			txnType: 'REFUND',
			orderId: order._id.toString(),
			txnId: order.onlinePayment.paymentId,
			refId: 'REFUND' + order._id.toString(),
			refundAmount: tf2(data.refundAmount).toString()
		};

		const paytmChecksum = await PaytmChecksum.generateSignature(
			JSON.stringify(paytmParams.body),
			config.paytm.paytm_key
		);

		paytmParams.head = {
			signature: paytmChecksum
		};

		const postData = JSON.stringify(paytmParams);

		const options: AxiosRequestConfig = {
			url: `${config.paytm.paytm_host}refund/api/v1/refund/apply/sync`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postData)
			},
			data: postData
		};

		const paytmRefund = await axios(options);
		if (paytmRefund.data.body.resultInfo.resultStatus !== 'TXN_SUCCESS') {
			throwError(419);
		}
		await order.save();
		sendRefundNotifications(order._id.toString());
		return {};
	} catch (error) {
		throw error;
	}
};

const sendRefundNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId);
		const buyerNotification = createBuyerNotification(
			'BUYER_REFUND_INITIATED',
			order.buyer.toString(),
			order
		);
		sendBuyerNotification(buyerNotification);
	} catch (error) {
		console.error(error);
	}
};

// export const sellerDispatch = async (
// 	id: string,
// 	data: { weight: number; height: number; breadth: number; length: number },
// 	user
// ) => {
// 	try {
// 		if (
// 			!(data?.weight >= 1) ||
// 			!(data?.height >= 1) ||
// 			!(data?.breadth >= 1) ||
// 			!(data?.length >= 1)
// 		) {
// 			throwError(400);
// 		}

// 		const order = await Order.findById(id);
// 		if (!order) {
// 			throwError(404);
// 		}
// 		await dispatchOrders(
// 			[
// 				{
// 					_id: id,
// 					weight: data.weight,
// 					height: data.height,
// 					length: data.length,
// 					breadth: data.breadth
// 				}
// 			],
// 			user,
// 			true
// 		);
// 		return {};
// 	} catch (error) {
// 		throw error;
// 	}
// };

export const adminDispatch = async (id: string, data: { amount: number; period: number }, user) => {
	try {
		if (!(data?.amount >= 0) || !(data?.period >= 1)) {
			throwError(400);
		}

		const order = await Order.findById(id);
		if (!order) {
			throwError(404);
		}

		const newStatus = {
			status: 'dispatch' as OrderStatus,
			date: new Date(),
			by: user._id,
			remarks: ''
		};
		order.statusHistory.push(newStatus);
		order.currentStatus = newStatus;

		order.delivery = {
			amount: tf2(data.amount),
			period: data.period
		};

		order.dispatched = { status: true, date: new Date() };
		await order.save();

		sendAdminDispatchNotifications(order._id.toString());

		return {};
	} catch (error) {
		throw error;
	}
};

const sendAdminDispatchNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId);
		const buyerNotification = createBuyerNotification(
			'BUYER_ORDER_DISPATCHED',
			order.buyer.toString(),
			{
				order,
				duration: order.delivery.period,
				hasCOD: order.paymentMode === 'cod' || order.paymentMode === 'online-cod'
			}
		);
		sendBuyerNotification(buyerNotification);
	} catch (error) {
		console.error(error);
	}
};

export const reAssignRider = async (data, user) => {
	try {
		const { order, newRider } = data;

		const [previousRider, newRiderDocument, orderDoc] = await Promise.all([
			Rider.findById(order.rider),

			Rider.findById(newRider),
			Order.findById(order._id)
		]);

		if (previousRider) {
			previousRider.activeOrders = previousRider.activeOrders.filter(
				(orderId) => orderId.toString() !== order?._id.toString()
			);

			await previousRider.save();

			const riderNotification = createRiderNotification(
				'RIDER_ORDER_TRANSFER',
				(order.rider as IRider)._id.toString(),
				order
			);
			sendRiderNotification(riderNotification);
		}

		if (newRiderDocument) {
			newRiderDocument.activeOrders = [...newRiderDocument.activeOrders, order._id];
			let riderLocation = newRiderDocument?.latestLocation?.coordinates;
			let sellerLocation = orderDoc?.sellerDetails?.shopLocation?.coordinates;
			let distance = await getDistanceWithGoogle(
				[riderLocation[1], riderLocation[0]],
				[sellerLocation[1], sellerLocation[0]]
			);

			orderDoc.distanceTraveled.riderToSeller = distance.distance;
			orderDoc.distanceTraveled.totalDistance =
				orderDoc.distanceTraveled.buyerToSeller + distance.distance;
			await newRiderDocument.save();
		}

		const updateOrder = await Order.findByIdAndUpdate(
			order._id,
			{ rider: newRider },
			{ new: true }
		);

		const riderNotification = createRiderNotification(
			'RIDER_ORDER_RECEIVED',
			(updateOrder.rider as IRider)._id.toString(),
			updateOrder
		);
		sendRiderNotification(riderNotification);

		let sellerNotification = createSellerNotification(
			'SELLER_ORDER_NEW_RIDER_ASSIGN',
			updateOrder.seller.toString(),
			updateOrder
		);
		sendSellerNotification(sellerNotification);

		return updateOrder;
	} catch (error) {
		throwError(error);
	}
};
