import { model, Types } from 'mongoose';
import {
	getLimit,
	getPage,
	getResults,
	getSkip,
	getSort,
	IListResponse
} from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { QueryObj } from '../../middlewares/query';
import { IGroupOrder } from '../../models/order/group-order';
import { ITopUpOrder } from '../../models/order/topUpOrder';
import OrderModel, { IOrder, IOrderItem, OrderStatus } from '../../models/order/order';
import * as dateFns from 'date-fns';
import { tf2 } from '../../helpers/number';
import { ICustomer } from '../../models/customer/customer';
import { turnInOrder, updateGroupOrdersDiscount } from '../seller/orders';
import { createSellerNotification } from '../../helpers/notifications/seller';
import {
	sendAdminNotification,
	sendBuyerNotification,
	sendSellerNotification
} from '../../helpers/notifications/notification';
import { createAdminNotification } from '../../helpers/notifications/admin';
import { createBuyerNotification } from '../../helpers/notifications/buyer';
import { completeRunningOrder } from '../../schedulars/order-maturity-schedular';
import { IProduct } from '../../models/seller/product';
import { ISeller } from '../../models/customer/seller';
import { removeOrders } from '../../helpers/removeOrders';
import { IRider } from '../../models/rider/rider';
import { calculateNewRating } from '../../helpers/calculateDistance';
import { getStripText } from '../../helpers/strip-text';
import { notifyOrderStatusUpdate } from '../rider/orders';
import { CronJob } from 'cron';
import { sendNewOrderReturnRequestMessageToDiscord } from '../discord/discord_webhook';
import { IHistory } from '../../models/general/history';

const Seller = model<ISeller>('NewCustomer');
const Customer = model<ICustomer>('Customer');
const Order = model<IOrder>('Order');
const TopUpOrder = model<ITopUpOrder>('TopUpOrder');
const NewProduct = model<IProduct>('NewProduct');
const GroupOrder = model<IGroupOrder>('GroupOrder');
const Rider = model<IRider>('Rider');
const ObjectId = Types.ObjectId;
const History = model<IHistory>('History');

export const getBuyerOrders = async (queryObj: QueryObj, user): Promise<IListResponse> => {
	try {
		const dbQuery: any = {
			buyer: user._id,
			$or: [
				{
					isGroupOrder: true,
					'matured.status': true
				},
				{
					isGroupOrder: true,
					'accepted.status': false
				},
				{
					isGroupOrder: true,
					'cancelled.status': true
				},
				{
					isGroupOrder: false
				}
			]
		};

		const dbProject: any = {
			sellerDetails: 1,
			seller: 1,
			buyerDetails: 1,
			processed: 1,
			isGroupOrder: 1,
			runningDuration: 1,
			groupOrder: 1,
			paymentMode: 1,
			order: 1,
			currentStatus: 1,
			createdAt: 1,
			items: {
				name: 1,
				quantity: 1
			},
			rating: 1,
			ETA: 1,
			deliveryMode: { charges: 1 }
		};

		const results = await getResults(
			queryObj,
			Order,
			dbQuery,
			dbProject,
			'name',
			'position',
			1,
			15,
			[{ path: 'rider', select: 'name contact' }]
		);

		results.data = results?.data?.map((element) => {
			let minutes = dateFns.differenceInMinutes(new Date(element.ETA), new Date());

			let timeString = convert_time(minutes);
			element.statusInfoText = {
				text: `Expected order arrival in ${timeString}`,
				backgroundColor: 'purple',
				color: 'white'
			};
			return element;
		});
		return results;
	} catch (error) {
		throw error;
	}
};

export const getBuyerTopUpOrders = async (queryObj: QueryObj, user) => {
	try {
		const dbQuery = {
			buyer: user._id
		};

		const dbProject = {
			buyer: 1,
			paymentMode: 1,
			amount: 1,
			status: 1,
			onlinePayment: 1,
			createdAt: 1
		};

		const topUpOrders = await getResults(
			queryObj,
			TopUpOrder,
			dbQuery,
			dbProject,
			'createdAt',
			'createdAt',
			-1,
			15
		);
		return topUpOrders;
	} catch (error) {
		throw error;
	}
};

export const getBuyerRunningOrders = async (user) => {
	try {
		const orders = await Order.aggregate([
			{
				$match: {
					buyer: ObjectId(user._id),
					isGroupOrder: true,
					'matured.status': false,
					'cancelled.status': false
				}
			},
			{
				$group: {
					_id: '$groupOrder',
					orders: { $push: '$$ROOT' }
				}
			},
			{
				$lookup: {
					from: 'grouporders',
					localField: '_id',
					foreignField: '_id',
					as: 'groupOrder'
				}
			},
			{
				$unwind: {
					path: '$groupOrder',
					preserveNullAndEmptyArrays: false
				}
			},
			{
				$lookup: {
					from: 'customers',
					localField: 'groupOrder.seller',
					foreignField: '_id',
					as: 'seller'
				}
			},
			{
				$unwind: {
					path: '$seller',
					preserveNullAndEmptyArrays: false
				}
			},
			{
				$project: {
					seller: {
						_id: 1,
						businessName: 1,
						priceTable: 1
					},
					orders: {
						_id: 1,
						order: 1
					},
					groupOrder: 1
				}
			}
		]);

		return orders || [];
	} catch (error) {
		throw error;
	}
};

export const getOrderById = async (orderId, user) => {
	try {
		const order = await Order.findById(orderId)
			.populate('items.product', '_id name thumbImages')
			.populate('rejectedItems.product', '_id name thumbImages')
			.populate('rider', '_id name contact latestLocation')
			.populate('coupon')
			.lean();

		if (!order) {
			throwError(404);
		}
		let text = '';
		let minutes = dateFns.differenceInMinutes(new Date(order.ETA), new Date());
		minutes = minutes > 0 ? minutes : 10;

		if (order.currentStatus.status == 'placed') {
			text = `You order has been placed. It will arrive in ${convert_time(minutes)}`;
		} else if (
			order.currentStatus.status == 'accepted' ||
			order.currentStatus.status == 'rider_accepted'
		) {
			text = `You order has been accepted by Seller. It will arrive in ${convert_time(
				minutes
			)}`;
		} else if (order.currentStatus.status == 'ready') {
			text = `Your order has been shipped. It will arrive in ${convert_time(minutes)}`;
		} else if (order.currentStatus.status == 'dispatch') {
			text = `Your order has been dispatched. It will arrive in ${convert_time(minutes)}`;
		} else if (order.currentStatus.status == 'arrived') {
			text = 'Please collect you order from doorstep.';
		}

		return {
			...order,
			statusInfo: {
				text,
				icon: 'timer',
				backgroundColor: 'purple',
				color: 'white'
			}
		};
	} catch (error) {
		throw error;
	}
};

export const cancelOrder = async (orderId, data, user) => {
	try {
		if (!data?.reason) {
			throwError(400);
		}
		const order = await Order.findOne({ _id: orderId, buyer: user._id });
		if (!order) {
			throwError(404);
		}
		if (order.isGroupOrder && order.matured?.status) {
			throwError(400);
		}

		if (!order.isGroupOrder && order.dispatched?.status) {
			throwError(400);
		}

		if (!order.statusHistory.find((st) => st.status === 'placed')) {
			throwError(400);
		}

		if (order.rejected?.status || order.cancelled?.status) {
			throwError(400);
		}
		let seller = await Seller.findById(order.seller);

		let customer = await Customer.findOne({ _id: user._id });
		if (!customer) {
			throwError(404);
		}
		order.cancelled = {
			status: true,
			date: new Date(),
			reason: data.reason,
			remarks: data.remarks || null
		};
		seller.orders.cancelled = seller.orders.cancelled || 0 + 1;

		const newStatus = {
			status: 'cancelled' as OrderStatus,
			by: user._id,
			date: new Date(),
			remarks: ''
		};

		order.currentStatus = newStatus;
		order.statusHistory.push(newStatus);

		await order.save();
		customer.orderCount = {
			total: customer?.orderCount?.total,
			delivery: customer?.orderCount?.delivery,
			cancel: (customer?.orderCount?.cancel || 0) + 1,
			pending: (customer?.orderCount?.pending || 0) - 1
		};
		let rewardBack = order?.rewardUse;
		if (order?.rewardUse) {
			customer.rewardBalance += rewardBack;
			await History.create({
				type: 'reward',
				buyer: order.buyer,
				amount: rewardBack,
				date: new Date(),
				action: 'credit',
				remark: `Canceled order ${orderId}`
			});
		}
		if (order?.walletUse) {
			customer.balance += order?.walletUse;
			await History.create({
				type: 'wallet',
				buyer: order.buyer,
				amount: order?.walletUse,
				date: new Date(),
				action: 'credit',
				remark: `Canceled order ${orderId}`
			});
		}
		if (order.paymentMode == 'online') {
			let IsPaymentSuccess = order.onlinePayment.status.findIndex(
				(status) => status.status === 'completed'
			);
			if (IsPaymentSuccess) {
				let amount = order.onlinePayment.amount;
				// update buyer wallet  with order amount
				let customer = await Customer.findOneAndUpdate(
					{
						_id: order.buyer
					},
					{ $inc: { balance: amount } }
				);

				await History.create({
					type: 'wallet',
					buyer: order.buyer,
					amount: amount,
					date: new Date(),
					action: 'credit',
					remark: `Canceled order ${orderId}.Online payment`
				});
			}
		}

		if (order?.rider) {
			let removeOrderFormActiveOrders = await Rider.updateOne(
				{ _id: order.rider },
				{ $pull: { activeOrders: order._id } }
			);

			global.io.emit('isDeliveryAvailable', {
				available: true,
				text: getStripText()
			});
		}
		await customer.save();

		// addItemsStock(order.items, order.seller);
		sendCancelOrderNotifications(order._id.toString());
		notifyOrderStatusUpdate(order.seller, order.rider);
	} catch (error) {
		throw error;
	}
};

const sendCancelOrderNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId).populate('buyer', 'name businessName');
		let seller = await Seller.findOne({ _id: order.seller });

		try {
			const sellerNotification = createSellerNotification(
				'SELLER_ORDER_CANCELLED',
				order.seller.toString(),
				order
			);
			sendSellerNotification(sellerNotification);
		} catch (error) {
			console.error(error);
		}

		try {
			const adminNotification = createAdminNotification('ADMIN_ORDER_CANCELLED', null, {
				order,
				buyer: order.buyer
			});
			sendAdminNotification(adminNotification);
			seller.orders.cancelled = seller.orders.cancelled + 1;
			await seller.save();
		} catch (error) {
			console.error(error);
		}

		try {
			const buyerNotification = createBuyerNotification(
				'BUYER_ORDER_CANCELLED',
				(order.buyer as ICustomer)._id.toString(),
				order
			);
			sendBuyerNotification(buyerNotification);
		} catch (error) {
			console.error(error);
		}
	} catch (error) {
		console.error(error);
	}
};

const updateGroupOrderAfterCancellation = async (order: IOrder) => {
	const groupOrder = await GroupOrder.findById(order.groupOrder).populate('seller', 'priceTable');
	if (!groupOrder.completed) {
		groupOrder.total = tf2(groupOrder.total - (order.order.mainAmt + order.order.mainGst));
		groupOrder.discount = reCalculateDiscount(groupOrder.total, groupOrder.seller as ISeller);
		const otherSameBuyerOrders = await Order.find({
			_id: { $ne: order._id },
			groupOrder: order.groupOrder,
			'accepted.status': true,
			'cancelled.status': false,
			buyer: order.buyer
		}).countDocuments();
		if (!otherSameBuyerOrders) {
			groupOrder.buyers = groupOrder.buyers - 1;
		}
		if (!groupOrder.buyers) {
			await completeRunningOrder(order.groupOrder as string);
			return;
		}
		await groupOrder.save();
		updateGroupOrdersDiscount(groupOrder, order._id);
		groupOrder.seller = (groupOrder.seller as ISeller)?._id;
		global.io.emit('runningOrderUpdated', {
			messageId: Date.now(),
			...groupOrder.toJSON()
		});
	}
};

const reCalculateDiscount = (groupTotal: number, seller: ISeller) => {
	let discount = 0;

	if (seller.priceTable && seller.priceTable.length) {
		const priceTable = [...seller.priceTable].sort((a, b) => a.price - b.price);
		if (groupTotal >= priceTable[0].price) {
			let index = 0;
			for (let [i, item] of priceTable.entries()) {
				if (item.price > groupTotal) {
					break;
				}
				index = i;
			}
			if (groupTotal === priceTable[index].price || index === priceTable.length - 1) {
				discount = priceTable[index].discount;
			} else {
				const baseDisc = priceTable[index].discount;
				const totalAmtDiff = priceTable[index + 1].price - priceTable[index].price;
				const amtDiff = groupTotal - priceTable[index].price;
				const discDiff = priceTable[index + 1].discount - priceTable[index].discount;
				const disc = (amtDiff * discDiff) / totalAmtDiff;
				const finalDisc = tf2(baseDisc + disc);
				discount = finalDisc > 0 ? finalDisc : 0;
			}
		}
	}
	return discount;
};

export const createReturnRequest = async (orderId, data, user) => {
	try {
		if (!data?.reason) {
			throwError(400);
		}
		const order = await Order.findOne({ _id: orderId });
		if (!order) {
			throwError(404);
		}
		// if (!order.returnPeriod || !order?.delivered?.status) {
		// 	throwError(400);
		// }

		// const lastDate = dateFns.add(new Date(order.delivered?.date), {
		// 	days: order.returnPeriod
		// });
		let customer = await Customer.findOne({ _id: order?.buyer });
		if (!customer) {
			throwError(400);
		}

		// if (new Date() >= lastDate) {
		// 	throwError(400);
		// }

		order.returnRequest.created = {
			status: true,
			date: new Date(),
			reason: data.reason,
			remarks: data?.remarks || ''
		};

		const newStatus = {
			status: 'return_requested' as OrderStatus,
			date: new Date(),
			by: user._id,
			remarks: ''
		};

		order.currentStatus = newStatus;
		order.statusHistory.push(newStatus);

		await order.save();

		sendReturnRequestNotifications(order._id.toString());
		sendNewOrderReturnRequestMessageToDiscord(order._id.toString());
		return {};
	} catch (error) {
		throw error;
	}
};

const sendReturnRequestNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId).populate('buyer', 'businessName name');
		try {
			const adminNotification = createAdminNotification('ADMIN_ORDER_RETURN_REQUEST', null, {
				order,
				buyer: order.buyer
			});
			sendAdminNotification(adminNotification);
		} catch (error) {
			console.error(error);
		}
		try {
			const sellerNotification = createSellerNotification(
				'SELLER_RETURN_REQUEST',
				order.seller.toString(),
				{
					order,
					buyer: order.buyer
				}
			);
			sendSellerNotification(sellerNotification);
		} catch (error) {
			console.error(error);
		}
		try {
			const buyerNotification = createBuyerNotification(
				'BUYER_RETURN_REQUEST',
				(order.buyer as ICustomer)._id.toString(),
				order
			);
			sendBuyerNotification(buyerNotification);
		} catch (error) {
			console.error(error);
		}
	} catch (error) {
		console.error(error);
	}
};
// what is that
const addItemsStock = async (items: IOrderItem[], seller: string | ISeller) => {
	try {
		for (let item of items) {
			const product = await NewProduct.findOne({
				_id: item.product,
				seller: seller
			});
			if (product) {
				const newStock =
					product.currentStock + item.quantity > 0
						? product.currentStock + item.quantity
						: 0;
				product.currentStock = newStock;
				product.save();
			}
		}
	} catch (error) {
		console.error('Cannot update product stock', error);
	}
};

export const orderRating = async (data) => {
	try {
		let { orderId, sellerRating, riderRating, sellerRemarks, riderRemarks } = data;
		let order = await Order.findOne({ _id: orderId });
		if (!order) {
			throwError(404);
		}

		sellerRating.remarks = sellerRemarks;
		riderRating.remarks = riderRemarks;

		const seller = await Seller.findOne({ _id: order.seller }).select('rating');
		let sellerRat = 0;

		if (seller.rating.overAll == 0) {
			sellerRat = sellerRating.rating;
		} else {
			sellerRat = calculateNewRating(
				seller.rating.overAll || 0,
				sellerRating.rating,
				seller.rating.buyerCount
			);
		}
		if (order?.rider) {
			let rider = await Rider.findOne({ _id: order.rider }).select('rating');

			let newRating =
				rider.rating.overAll == 0
					? riderRating.rating
					: calculateNewRating(
							rider.rating.overAll,
							riderRating.rating,
							rider.rating.buyerCount
					  );

			rider.rating.overAll = newRating;
			rider.rating.buyerCount += 1;

			await rider.save();
		}
		seller.rating = {
			overAll: sellerRat,
			buyerCount: (seller.rating.buyerCount || 0) + 1,
			riderCount: seller.rating.riderCount || 0
		};
		seller.save();
		order.rating.buyerToSeller.rating = sellerRating.rating || 5;
		order.rating.buyerToRider.rating = riderRating.rating || 5;
		order.rating.overAll = +((riderRating.rating + sellerRating.rating) / 2).toFixed(1) || 5;

		order.rating.buyerToSeller.remarks = sellerRating.remarks;
		order.rating.buyerToRider.remarks = riderRating.remarks;

		await order.save();
		return order;
	} catch (e) {
		throwError;
	}
};

// this function is used to  send rating related  feedback information
export const ratingReasons = async () => {
	const sellerSideReasons = [
		{
			headerText: 'What did you like the least in this Order?',
			reasons: [
				'Quality',
				'Seller’s behaviour',
				'Packaging',
				'Hygiene',
				'Expired items',
				'Wrong items',
				'Lesser items',
				'Delayed order approval'
			]
		},
		{
			headerText: 'What did you like the least in this Order?',
			reasons: [
				'Quality',
				'Seller’s behaviour',
				'Packaging',
				'Hygiene',
				'Expired items',
				'Wrong items',
				'Lesser items',
				'Delayed order approval'
			]
		},
		{
			headerText: 'What do you like to improve in this Order?',
			reasons: [
				'Quality',
				'Seller’s behaviour',
				'Packaging',
				'Hygiene',
				'Expired items',
				'Wrong items',
				'Lesser items',
				'Delayed order approval'
			]
		},

		{
			headerText: 'What did you like the most in this Order?',
			reasons: [
				'Quality',
				'Seller’s behaviour',
				'Packaging',
				'Hygiene',
				'Quick order approval'
			]
		},
		{
			headerText: 'What did you like the most in this Order?',
			reasons: [
				'Quality',
				'Seller’s behaviour',
				'Packaging',
				'Hygiene',
				'Quick order approval'
			]
		}
	];

	const riderSideReasons = [
		{
			headerText: 'What did you like the least about the Rider?',
			reasons: [
				'Behaviour',
				'Hygiene',
				'Communication',
				'Wrongly marked Delivered',
				'Delivery Speed',
				'Not wearing Uniform',
				'No-contact Delivery',
				'Asked for Extra money'
			]
		},
		{
			headerText: 'What did you like the least about the Rider?',
			reasons: [
				'Behaviour',
				'Hygiene',
				'Communication',
				'Wrongly marked Delivered',
				'Delivery Speed',
				'Not wearing Uniform',
				'No-contact Delivery',
				'Asked for Extra money'
			]
		},
		{
			headerText: 'Where do you want the Rider to improve?',
			reasons: [
				'Behaviour',
				'Hygiene',
				'Communication',
				'Wrongly marked Delivered',
				'Delivery Speed',
				'Not wearing Uniform',
				'No-contact Delivery',
				'Asked for Extra money'
			]
		},
		{
			headerText: 'What did you like the most about the Rider?',
			reasons: ['Behaviour', 'Hygiene', 'Communication', 'No-contact Delivery']
		},
		{
			headerText: 'What did you like the most about the Rider?',
			reasons: ['Behaviour', 'Hygiene', 'Communication', 'No-contact Delivery']
		}
	];
	return {
		sellerReasons: sellerSideReasons,
		riderReasons: riderSideReasons
	};
};
export const convert_time = (time: number): string => {
	if (time < 5) {
		time = 5;
	}
	let hours = Math.floor(time / 60);
	let minutes = time % 60;

	if (hours > 0) {
		return `${hours} Hr ${minutes} Min`;
	} else {
		if (minutes > 50) {
			return `${minutes} Min.`;
		}
		return `${minutes} - ${minutes + 10} Min.`;
	}
};
