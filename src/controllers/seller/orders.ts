import { add, startOfDay, endOfDay, addMinutes, isPast } from 'date-fns';
import { LeanDocument, model } from 'mongoose';
import { calculateDiscount } from '../../helpers/discount';
import { createAdminNotification } from '../../helpers/notifications/admin';
import { createBuyerNotification } from '../../helpers/notifications/buyer';
import {
	sendAdminNotification,
	sendBuyerNotification,
	sendRiderNotification,
	sendSellerNotification
} from '../../helpers/notifications/notification';
import { createSellerNotification } from '../../helpers/notifications/seller';
import { tf2, tf0 } from '../../helpers/number';
import { getResults } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { QueryObj } from '../../middlewares/query';
import { ICustomer } from '../../models/customer/customer';
import { IGroupOrder } from '../../models/order/group-order';
import { IOrder, IOrderItem, OrderStatus } from '../../models/order/order';
import { IProduct } from '../../models/seller/product';
import { completeRunningOrder } from '../../schedulars/order-maturity-schedular';
import { getCustomerCoupon, applyCoupon } from '../customers/coupons';
import {
	assignRider,
	calculateDeliveryCharges,
	prepareDiscountWithCoupon,
	prepareMainAmtWithCoupon
} from '../customers/order';
import { ISeller } from '../../models/customer/seller';
const Area = model<IAreas>('Areas');
const Version = model<IVersion>('Version');
const Order = model<IOrder>('Order');
const GroupOrder = model<IGroupOrder>('GroupOrder');
const Customer = model<ICustomer>('Customer');
const Seller = model<ISeller>('NewCustomer');
const Coupon = model<ICoupon>('Coupon');
import { IRider } from '../../models/rider/rider';
import { createRiderNotification } from '../../helpers/notifications/rider';
import { ICoupon } from '../../models/customer/coupons';
import { notifyOrderStatusUpdate, riderOrderAcceptance } from '../rider/orders';
const Rider = model<IRider>('Rider');
const NewProductModel = model<IProduct>('NewProduct');
import { CronJob } from 'cron';
import { IAreas } from '../../models/locations/goodAreas';
import { IVersion } from '../../models/general/version';
import { sendRejectOrderMessage } from '../webhook/webhook';
import { IHistory } from '../../models/general/history';
import { sendAlternateShopOption } from '../webhook/orderReject';

const History = model<IHistory>('History');
export const getOrderForTurnIn = async (orderId, user) => {
	try {
		const order = await Order.findById(orderId)
			.populate('items.product', '_id name thumbImages')
			.populate('seller', 'runningItems');

		if (!order) {
			throwError(404);
		}

		return order;
	} catch (error) {
		throw error;
	}
};

export const turnInOrder = async (orderId, data: any, user) => {
	try {
		if (
			!(
				data?.acceptedItems?.length >= 0 ||
				data?.rejectedItems?.length >= 0 ||
				data?.itemsWithQuantity?.length >= 0
			)
		) {
			throwError(400);
		}

		//Populate the order with the products and then populate the products with the price
		const order = await Order.findById(orderId).populate({
			path: 'items.product',
			select: 'name thumbImages minPrice'
		});
		const seller = await Seller.findById(user._id).select(
			'sellerInvoiceNumber priceTable runningItems'
		);
		if (!order || !seller) {
			throwError(404);
		}
		if (order?.cancelled?.status === true) {
			throwError(419);
		}
		const deliveryMode = data?.deliveryMode;
		const packingTime = data?.packingTime;
		const acceptedItems = data.acceptedItems;
		const rejectedItems = data.rejectedItems;
		const itemsWithQuantity = data.itemsWithQuantity;

		order.items = order.items.map((i) => {
			i.accepted = !!acceptedItems.find(
				(item) => item.product._id.toString() === (i.product as IProduct)._id.toString()
			);
			return i;
		});
		order.rejectedItems = order.items.filter((i) => !i.accepted);
		order.items = order.items.filter((i) => i.accepted);

		order.items = order.items.map((i) => {
			let acceptedItem = acceptedItems.find(
				(item) => item.product._id.toString() === (i.product as IProduct)._id.toString()
			);

			if (acceptedItem) {
				if (i.quantity !== acceptedItem?.availableQty) {
					let rejectedQuantity = i.quantity - acceptedItem?.availableQty;

					order.rejectedItems.push({
						commission: i.commission,
						variant: i.variant,
						itemSet: i.itemSet,
						insured: i.insured,
						accepted: i.accepted,
						rejected: i.rejected,

						product: i.product,
						itemType: i.itemType,
						quantity: rejectedQuantity,
						name: i.name,
						mainCategory: i.mainCategory,
						insurance: i.insurance,
						service: i.service,
						gst: i.gst,
						unitPrice: tf2((i.unitPrice / i.quantity) * rejectedQuantity),
						amounts: {
							main: tf2((i.amounts.main / i.quantity) * rejectedQuantity),
							net: tf2((i.amounts.net / i.quantity) * rejectedQuantity),
							gst: tf2((i.amounts.gst / i.quantity) * rejectedQuantity),
							total: tf2((i.amounts.total / i.quantity) * rejectedQuantity),
							discount: tf2((i.amounts.discount / i.quantity) * rejectedQuantity)
						},
						gstType: i.gstType,
						discount: tf2((i.discount / i.quantity) * rejectedQuantity)
					});
				}
				i.quantity = acceptedItem?.availableQty;
			} else {
				console.error(acceptedItem, i, '------');
			}
			return i;
		});

		if (acceptedItems.length) {
			order.accepted = {
				status: true,
				date: new Date()
			};

			//check so that prevent duplicate status
			const existingStatus = order.statusHistory.some(
				(status) => status.status === 'accepted'
			);

			if (!existingStatus) {
				order.currentStatus = {
					status: 'accepted',
					date: new Date(),
					by: user._id,
					remarks: ''
				};

				order.statusHistory.push(order.currentStatus);
			}
		} else {
			order.rejected = {
				status: true,
				date: new Date()
			};
			order.currentStatus = {
				status: 'rejected' as OrderStatus,
				date: new Date(),
				by: user._id,
				remarks: ''
			};
			order.statusHistory.push(order.currentStatus);
		}

		if (order.rejectedItems.length > 0) {
			if (order?.coupon) {
				let coupon = await Coupon.findById(order.coupon).lean();
				if (order.couponProvidedBy === 'seller') {
					await prepareMainAmtWithCoupon(order);

					await prepareDiscountWithCoupon(
						order,
						order.couponDeduction,
						false,
						order.order.totalAmt
					);
				} else {
					await prepareItemsPrice(order);
					await prepareDiscount(order, seller, 0);

					// order.order.totalAmt = order.order.totalAmt - order.couponDeduction;
				}
			} else {
				if (acceptedItems.length) {
					await prepareItemsPrice(order);
					await prepareDiscount(order, seller, 0);
				}
			}
		}
		order.order.codAmt = 0;

		if (data?.deliveryMode != data?.initialDeliveryMode) {
			if (data?.deliveryMode == 0) {
				let activeRiderVersion = await Version.findOne({
					appName: 'rider-mobile',
					latest: true
				})
					.select('metadata')
					.lean();
				const maxOrderPerRider = activeRiderVersion?.metadata?.maxOrderPerRider || 1;

				let goodArea = await Area.findOne({
					loc: {
						$geoIntersects: {
							$geometry: {
								type: 'Point',
								coordinates:
									order?.buyerDetails?.shippingAddress?.location?.coordinates
							}
						}
					}
				}).select('deliveryFee');
				let deliveryData = goodArea.deliveryFee;
				let deliveryCharge = calculateDeliveryCharges(
					order?.deliveryMode?.distance,
					deliveryData,
					order?.coupon?.type,
					1,
					0
				);
				order.deliveryMode.value = 0;

				order.deliveryMode.surge = deliveryCharge?.surgeCharges;
				order.deliveryMode.longDistance = deliveryCharge?.longDistanceCharges;
				order.deliveryMode.display = 'Upgraded to platform-specific delivery';
				order.freeDeliveryAmt = 0;
				order.deliveryMode.base = deliveryCharge.totalCharges;
				order.deliveryMode.methodChanged = true;
			}
		}

		data.commission = {
			netAmt: 0,
			gst: 18,
			gstAmt: 0,
			tcs: 0,
			tcsAmt: 0,
			totalAmt: 0,
			restaurantGst: 0,
			insurance: 0,
			gstExampted: 0,
			insuredItemValue: 0,
			insuredItemCommission: 0,
			insuredRestItemValue: 0
		};
		data.order = {
			mainAmt: 0,
			mainGst: 0,
			netAmt: 0,
			gstAmt: 0,
			totalAmt: 0
		};

		for (let item of order.items) {
			let insurance = item.insured && order.deliveryMode.value == 0;

			let restaurantItem = item.service == 'Restaurant';
			let restaurantGst = item.service == 'Restaurant' ? tf2(item.amounts.net * 0.05) : 0;

			data.commission.restaurantGst += restaurantGst;
			let insu = insurance ? tf2(item.amounts.net * 0.01 * item.insurance) || 0 : 0;

			data.commission.insurance += insu;

			data.commission.insuredRestItemValue +=
				insurance && restaurantItem ? item.amounts.net : 0;
			data.commission.gstExampted += item.gstType == 'none' ? item.amounts.net : 0;
			data.commission.tcs +=
				!restaurantItem && item.gstType !== 'none' ? item.amounts.net * 0.01 : 0;

			data.commission.netAmt = tf2(data.commission.netAmt + item.commission.amounts.net);
			if (!restaurantItem && item.gstType !== 'none') {
			}
			data.commission.insuredItemCommission += insurance ? item.commission.amounts.net : 0;
			data.commission.insuredItemValue += insurance ? item.amounts.net : 0;

			data.order.mainAmt = tf2(data.order.mainAmt + item.amounts.main);
			data.order.mainGst = tf2(data.order.mainGst + item.amounts.gst + restaurantGst);
			data.order.netAmt = tf2(data.order.netAmt + item.amounts.net);
			data.order.gstAmt = tf2(data.order.gstAmt + item.amounts.gst);

			data.order.totalAmt = tf2(data.order.totalAmt + item.amounts.total + restaurantGst);
		}

		data.commission.gstAmt = tf2(data.commission.netAmt * 0.01 * data.commission.gst);
		data.commission.totalAmt = tf2(data.commission.netAmt + data.commission.gstAmt);

		order.commission = data.commission;
		const runningItems = seller.runningItems || [];

		// for (let item of itemsWithQuantity) {
		// 	const existing = runningItems.find(
		// 		(i) =>
		// 			i.product.toString() === item.product.toString() &&
		// 			(item.itemType === 'set'
		// 				? i.itemSet.toString() === item.itemSet.toString()
		// 				: i.variant.toString() === item.variant.toString())
		// 	);

		// 	if (!existing) {
		// 		runningItems.push({
		// 			product: item.product,
		// 			itemType: item.itemType,
		// 			variant: item.variant,
		// 			itemSet: item.itemSet,
		// 			initialQty: item.availableQty,
		// 			availableQty: item.availableQty
		// 		});
		// 	}
		// }

		// for (let item of order.items) {
		// 	const running = runningItems.find(
		// 		(i) =>
		// 			i.product.toString() === item.product.toString() &&
		// 			(item.itemType === 'set'
		// 				? i.itemSet.toString() === item.itemSet._id.toString()
		// 				: i.variant.toString() === item.variant._id.toString())
		// 	);
		// 	if (running) {
		// 		running.availableQty = tf2(running.availableQty - item.quantity);
		// 	}
		// }

		if (acceptedItems.length) {
			await seller.save();
		}
		let onlineAmount = 0;

		order.packingTime = packingTime || 0;

		if (order.paymentMode == 'online') {
			let IsPaymentSuccess = order.onlinePayment.status.findIndex(
				(status) => status.status === 'completed'
			);
			if (IsPaymentSuccess) {
				onlineAmount = order.onlinePayment.amount;
			}
		}

		if (
			onlineAmount + order.walletUse + order.rewardUse >
			order.order.totalAmt + order.deliveryMode.charges
		) {
			await walletAndCashbackSettlement(order, onlineAmount);
		}

		await assignRider(order);

		await order.save();
		if (!order?.rejected?.status) {
			if (order.coupon) {
				await applyCoupon(order.buyer);
			}

			sendTurnInNotifications(order._id.toString());
		}
		notifyOrderStatusUpdate(seller._id, order.rider);
		return order;
	} catch (error) {
		throw error;
	}
};

const sendTurnInNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId).populate('seller', 'name businessName');
		const acceptedItemNames = order.items.map((item) => item.name);
		const rejectedItemNames = order.rejectedItems.map((item) => item.name);
		if (rejectedItemNames.length) {
			try {
				const adminNotification = createAdminNotification('ADMIN_TURN_IN_REJECTED', null, {
					order,
					productNames: rejectedItemNames,
					seller: order.seller
				});
				sendAdminNotification(adminNotification);
			} catch (error) {
				console.error(error);
			}
			try {
				const buyerNotification = createBuyerNotification(
					'BUYER_ORDER_REJECTED',
					order.buyer.toString(),
					{
						order,
						productNames: rejectedItemNames,
						seller: order.seller
					}
				);
				sendBuyerNotification(buyerNotification);
				// sendAlternateShopOption(order._id);
			} catch (error) {
				console.error(error);
			}
		}
		if (acceptedItemNames.length) {
			try {
				try {
					const adminNotification = createAdminNotification('ADMIN_TURN_IN', null, {
						order,
						productNames: acceptedItemNames,
						seller: order.seller
					});
					sendAdminNotification(adminNotification);
				} catch (error) {
					console.error(error);
				}
				try {
					const buyerNotification = createBuyerNotification(
						'BUYER_ORDER_ACCEPTED',
						order.buyer.toString(),
						{
							order,
							productNames: acceptedItemNames,
							seller: order.seller
						}
					);
					sendBuyerNotification(buyerNotification);
				} catch (error) {
					console.error(error);
				}
				try {
					const riderNotification = createRiderNotification(
						'RIDER_ORDER_RECEIVED',
						(order.rider as IRider)._id.toString(),
						order
					);
					sendRiderNotification(riderNotification);
				} catch (error) {
					console.error(error);
				}
			} catch (error) {
				console.error(error);
			}
		}
	} catch (error) {
		console.error(error);
	}
};

const sendGroupOrderStartedNotifications = async (groupOrderId: string) => {
	try {
		const groupOrder = await GroupOrder.findById(groupOrderId);
		const sellerNotification = createSellerNotification(
			'SELLER_GROUP_ORDER_STARTED',
			groupOrder.seller.toString(),
			groupOrder
		);
		sendSellerNotification(sellerNotification);
	} catch (error) {
		console.error(error);
	}
};

const prepareItemsPrice = async (data: IOrder) => {
	data.order = {
		mainAmt: 0,
		mainGst: 0,
		netAmt: 0,
		gstAmt: 0,
		totalAmt: 0
	};

	// Beware of lack of precision while rounding to 2 decimal places
	data.commission = { restaurantGst: 0, insurance: 0 };
	for (let item of data.items) {
		item.gst = 0;
		item.unitPrice = 0;
		item.amounts = {
			main: 0,
			net: 0,
			gst: 0,
			total: 0
		};

		// restaurant related items calcultion

		const minPrice = (item.product as IProduct).minPrice;
		item.unitPrice = minPrice.mainPrice; // Item price without GST
		item.amounts.main = tf2(item.quantity * item.unitPrice);
		let netPrice = tf2(minPrice.sellingPrice * item.quantity);
		// Items price without GST
		item.amounts.net = netPrice; //
		item.gstType = minPrice.gstType; // [Inclusive, Exclusive, No GST]
		item.gst = minPrice.gst; // GST percentage
		item.amounts.margin = 0;
		item.amounts.gst = tf2(item.quantity * minPrice.gstValue); // GST Value
		item.amounts.total = tf2(item.amounts.net + item.amounts.gst); // Total amount of item
		let restaurantGst = item.service == 'Restaurant' ? tf2(item.amounts.net * 0.05) : 0;

		data.order.mainAmt = tf2(data.order.mainAmt + item.amounts.main);
		data.order.mainGst = tf2(data.order.mainGst + item.amounts.gst + restaurantGst);
		data.order.netAmt = tf2(data.order.netAmt + item.amounts.net);
		data.order.gstAmt = tf2(data.order.gstAmt + item.amounts.gst);
		data.commission.restaurantGst = tf2(data.commission.restaurantGst + restaurantGst);
		data.order.totalAmt = tf2(data.order.totalAmt + item.amounts.total + restaurantGst);
	}
};

const prepareDiscount = async (order: IOrder, seller: ISeller, groupTotal: number) => {
	const totalAmt = groupTotal + order.order.mainAmt + order.order.mainGst;
	let discount = 0;
	await updateOrderDiscount(order, discount);
};

const updateOrderDiscount = async (order: IOrder, discount: number) => {
	order.order = {
		...order.order,
		mainAmt: 0,
		mainGst: 0,
		discount: discount,
		discountAmt: 0,
		netAmt: 0,
		gstAmt: 0,
		totalAmt: 0
	};

	order.commission = {
		...order.commission,
		netAmt: 0,
		gst: 18,
		gstAmt: 0,
		tcs: 0,
		tcsAmt: 0,
		totalAmt: 0
	};

	for (let item of order.items) {
		item.discount = calculateItemDiscountPercentage(item, discount);

		item.amounts.discount = tf2(item.amounts.main * 0.01 * item.discount);
		const itemMainGst = tf2(item.amounts.main * 0.01 * item.gst);
		item.amounts.net = tf2(item.amounts.main - item.amounts.discount);
		item.amounts.gst = tf2(item.amounts.net * 0.01 * item.gst);
		item.amounts.total = tf0(item.amounts.net + item.amounts.gst);
		order.order.mainAmt = tf2(order.order.mainAmt + item.amounts.main);
		order.order.mainGst = tf2(order.order.mainGst + itemMainGst);
		order.order.discountAmt = tf2(order.order.discountAmt + item.amounts.discount);
		order.order.netAmt = tf2(order.order.netAmt + item.amounts.net);
		order.order.gstAmt = tf2(order.order.gstAmt + item.amounts.gst);
		order.order.totalAmt = tf2(order.order.totalAmt + item.amounts.total);

		item.commission.amounts.net = 0;
		item.commission.amounts.gst = 0;
		item.commission.amounts.total = 0;

		item.commission.amounts.net = tf2(item.amounts.net * 0.01 * item.commission.percentage);
		item.commission.amounts.gst = tf2(item.commission.amounts.net * 0.01 * item.commission.gst);
		item.commission.amounts.total = tf2(
			item.commission.amounts.net + item.commission.amounts.gst
		);

		order.commission.netAmt = tf2(order.commission.netAmt + item.commission.amounts.net);
	}

	order.order.discount = tf2(100 * (order.order.discountAmt / order.order.mainAmt));
	order.order.totalAmt += order.commission.restaurantGst;
	order.order.codAmt =
		order.order.tokenAmt > order.order.totalAmt
			? 0
			: tf2(order.order.totalAmt - order.order.tokenAmt);
	order.codPayment.amount = order.order.codAmt;

	order.commission.gstAmt = tf2(order.commission.netAmt * 0.01 * order.commission.gst);
	order.commission.tcsAmt = tf2(order.order.netAmt * 0.01 * order.commission.tcs);
	order.commission.totalAmt = tf0(order.commission.netAmt + order.commission.gstAmt);

	if (order.paymentMode === 'online' || order.paymentMode === 'online-cod') {
		if (order.onlinePayment.amount > order.order.totalAmt) {
			order.buyerReceivable = order.onlinePayment.amount - order.order.totalAmt;
			order.codPayment.amount = order.order.codAmt;
		}
	}

	var user = { _id: order.buyer };
	const res: ICoupon = await Coupon.findOne({ _id: order.coupon });
	const customer = await Customer.findOne({ _id: user._id });
	const percent = customer.walletDiscountPercent;

	order.sellerPayable = tf2(
		order.order.totalAmt - order.commission.totalAmt - order.commission.tcsAmt
	);
	let totalAmt = order.order.totalAmt;
	if (res?.providedBy == 'platform') {
		totalAmt =
			res?.type == 'delivery'
				? order.order.totalAmt
				: order.order.totalAmt - order.couponDeduction;
	}
	let walletApplied =
		customer.rewardBalance > 0
			? (totalAmt * percent) / 100 > 0
				? (totalAmt * percent) / 100
				: 0
			: 0;
	order.order.totalAmt = customer.walletUsed ? totalAmt - walletApplied : totalAmt;
	customer.rewardBalance =
		walletApplied > 0 ? customer.rewardBalance - walletApplied : customer.rewardBalance;
	await customer.save();
};

const calculateItemDiscountPercentage = (item: IOrderItem, discount: number): number => {
	let minPrice = (item.product as IProduct).minPrice;
	let MRP = minPrice.price * item.quantity;
	const finalPrice = minPrice.sellingPrice * item.quantity;

	return tf2(100 * (1 - finalPrice / MRP));
};

export const updateGroupOrdersDiscount = async (groupOrder: IGroupOrder, orderId: string) => {
	try {
		//Untested code, needs to be tested before using when group orders are implemented
		const orders = await Order.aggregate([
			{
				$match: {
					groupOrder: groupOrder._id,
					_id: { $ne: orderId },
					'accepted.status': true,
					'cancelled.status': false
				}
			},
			{
				$lookup: {
					from: 'products',
					localField: 'items.product',
					foreignField: '_id',
					as: 'items.product'
				}
			},
			{
				$unwind: '$items.product'
			},
			{
				$lookup: {
					from: 'prices',
					let: { sellerId: '$seller' },
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$seller', '$$sellerId']
								}
							}
						}
					],
					as: '$items.product.minPrice'
				}
			},
			{
				$unwind: '$items.product.minPrice'
			}
		]);

		for (let order of orders) {
			await updateOrderDiscount(order, groupOrder.discount);
			await order.save();
		}
		return null;
	} catch (error) {
		console.error(error);
	}
};

export const getRunnningOrderDetails = async (user: any) => {
	try {
		let groupOrder = await GroupOrder.findOne({
			seller: user._id,
			status: 'active',
			completed: false,
			endDate: { $gte: new Date() }
		});
		let orders = [];
		if (groupOrder) {
			orders = await Order.find({
				groupOrder: groupOrder._id,
				'accepted.status': true,
				'cancelled.status': false
			})
				.select({
					buyerDetails: {
						name: 1
					},
					order: 1,
					items: 1,
					createdAt: 1
				})
				.sort({ createdAt: -1 })
				.lean();

			orders = orders.map((o) => {
				o.items = Object.keys(
					o.items.reduce((all, item) => {
						if (!all[item.name]) {
							all[item.name] = '';
						}
						return all;
					}, {})
				);
				return o;
			});
		}
		return {
			groupOrder,
			orders
		};
	} catch (error) {
		throw error;
	}
};

export const getOrderById = async (orderId, user) => {
	try {
		const order = await Order.findById(orderId)
			.populate('items.product', '_id name description thumbImages minPrice')
			.populate('rider', '_id name contact kycDocument latestLocation')
			.populate('rejectedItems.product', '_id name thumbImages')
			.lean();

		if (!order) {
			throwError(404);
		}

		// Move the description field to the root of each item if it exists
		if (order.items && order.items.length > 0) {
			order.items.forEach((item: any) => {
				if (item.product && item.product.description) {
					item.description = item.product.description;
				}
			});
		}

		const orderRejectOption = [
			{
				id: 1,
				reason: 'Items are out of stock'
			},
			{
				id: 2,
				reason: 'Items price are not correct'
			},
			{
				id: 3,
				reason: 'Shop was close'
			}
		];

		// Check the order status
		if (
			['delivered', 'cancelled', 'returned', 'rejected', 'failed'].includes(
				order.currentStatus.status
			)
		) {
			delete order.buyerDetails;
		}

		return { ...order, orderRejectOption };
	} catch (error) {
		throw error;
	}
};

export const getAloneOrdersForDispatch = async (user) => {
	try {
		let orders = await Order.find({
			seller: user._id,
			isGroupOrder: false,
			'accepted.status': true,
			'delivered.status': false,
			'cancelled.status': false
		})
			.select({
				buyerDetails: {
					name: 1,
					contact: 1
				},
				order: 1,
				items: 1,
				createdAt: 1,
				paymentMode: 1,
				dispatched: { status: 1 }
			})
			.sort({ createdAt: 1 })
			.lean();

		orders = orders.map((o) => {
			o.items = Object.keys(
				o.items.reduce((all, item) => {
					if (!all[item.name]) {
						all[item.name] = '';
					}
					return all;
				}, {})
			) as any;
			return o;
		});
		return orders;
	} catch (error) {
		throw error;
	}
};

export const getGroupOrdersForDispatch = async (user) => {
	try {
		let orders = await Order.find({
			seller: user._id,
			isGroupOrder: true,
			'accepted.status': true,
			'matured.status': true,
			'dispatched.status': false,
			'cancelled.status': false
		})
			.populate('groupOrder')
			.select({
				groupOrder: 1,
				buyerDetails: {
					name: 1
				},
				order: 1,
				items: 1,
				createdAt: 1,
				dispatched: { status: 1 }
			})
			.sort({
				createdAt: 1
			})
			.lean();

		orders = orders.map((o) => {
			o.items = Object.keys(
				o.items.reduce((all, item) => {
					if (!all[item.name]) {
						all[item.name] = '';
					}
					return all;
				}, {})
			) as any;
			return o;
		});

		let groups = Object.values(
			orders.reduce((groups, order) => {
				if (!groups[(order.groupOrder as IGroupOrder)._id.toString()]) {
					groups[(order.groupOrder as IGroupOrder)._id.toString()] = {
						...(order.groupOrder as any),
						orders: []
					};
				}
				groups[(order.groupOrder as IGroupOrder)._id.toString()].orders.push({
					...order,
					groupOrder: null
				});
				return groups;
			}, {})
		);
		groups = groups.map((group) => {
			group.dispatched = group.orders.every((order) => order.dispatched.status === true);
			return group;
		});

		return groups || [];
	} catch (error) {
		throw error;
	}
};

export const getGroupOrderDetailsById = async (groupOrderId) => {
	try {
		const groupOrder: LeanDocument<IGroupOrder> & Record<string, any> = (
			await GroupOrder.findById(groupOrderId)
		).toJSON();
		let orders = await Order.find({
			groupOrder: groupOrderId,
			'accepted.status': true
		})
			.select({
				buyerDetails: {
					name: 1
				},
				order: 1,
				items: 1,
				createdAt: 1,
				dispatched: { status: 1 }
			})
			.sort({
				createdAt: 1
			})
			.lean();

		orders = orders.map((o) => {
			o.items = Object.keys(
				o.items.reduce((all, item) => {
					if (!all[item.name]) {
						all[item.name] = '';
					}
					return all;
				}, {})
			) as any;
			return o;
		});
		groupOrder.orders = orders;
		groupOrder.dispatched = orders.every((order) => order.dispatched.status === true);

		return groupOrder;
	} catch (error) {
		throw error;
	}
};
export const rejectOrder = async (
	data: {
		remarks: string;
		_id: string;
		amount: number;
		period: number;
		rewardUse: number;
		walletUse: number;
		buyer: string;
	}[],
	user,
	fromAdmin = false
) => {
	try {
		if (!data || !data.length) {
			throwError(400);
		}
		const newStatus = {
			status: 'rejected' as OrderStatus,
			date: new Date(),
			remarks: data[0]?.remarks,
			by: user._id
		};
		for (let order of data) {
			let currOrder = await Order.findOneAndUpdate(
				{
					_id: order._id,
					...(!fromAdmin ? { seller: user._id } : {})
				},
				{
					$set: {
						currentStatus: newStatus,
						rejected: {
							status: true,
							date: new Date(),
							remarks: order.remarks
						}
					},
					$push: {
						statusHistory: newStatus
					}
				},
				{ useFindAndModify: false, new: true }
			);

			if (currOrder?.rewardUse || currOrder?.walletUse) {
				let buyer = await Customer.findOneAndUpdate(
					{ _id: currOrder.buyer },
					{ $inc: { balance: currOrder.walletUse, rewardBalance: currOrder.rewardUse } }
				);
			}
			if (currOrder.paymentMode == 'online') {
				let IsPaymentSuccess = currOrder.onlinePayment.status.findIndex(
					(status) => status.status === 'completed'
				);
				if (IsPaymentSuccess) {
					let amount = currOrder.onlinePayment.amount;
					// update buyer wallet  with order amount
					let customer = await Customer.findOneAndUpdate(
						{
							_id: currOrder.buyer
						},
						{ $inc: { balance: amount } }
					);
				}
			}
		}

		sendRejectOrderMessage(data);

		if (data && data.length > 0 && data[0].remarks === 'Items are out of stock') {
			// sendAlternateShopOption(data[0]._id);
		}

		return {};
	} catch (error) {
		throw error;
	}
};

//sending  notify in 4 minutes to accept the order
const notifiedOrders = new Set();

function sendNotifySellerIn3Minutes(order: any) {
	if (order.currentStatus !== 'rejected' && !notifiedOrders.has(order._id)) {
		const sellerNotification = createSellerNotification(
			'SELLER_WARNING_ORDER_PLACED',
			order.seller.toString(),
			order
		);
		sendSellerNotification(sellerNotification);
		notifiedOrders.add(order._id);
	}
}

export const rejectOrderIfSellerNotAccept = async () => {
	try {
		// const newStatus = {
		// 	status: 'rejected' as OrderStatus,
		// 	date: new Date(),
		// 	remarks: ''
		// };

		const ordersForNotify = await Order.find({
			'currentStatus.status': 'placed',
			'currentStatus.date': {
				$lt: new Date(Date.now() - 4 * 60 * 1000),
				$gt: new Date(Date.now() - 5 * 60 * 1000)
			}
		});

		for (const order of ordersForNotify) {
			sendNotifySellerIn3Minutes(order);
		}

		// const orders = await Order.find({
		// 	'currentStatus.status': 'placed',
		// 	'currentStatus.date': { $lt: new Date(Date.now() - 5 * 60 * 1000) }
		// });

		// for (const order of orders) {
		// 	if (notifiedOrders.has(order._id)) {
		// 		continue; // skip notification if order has already been notified
		// 	}

		// 	order.currentStatus = newStatus;
		// 	order.statusHistory.push(newStatus);

		// 	if (order.rewardUse || order.walletUse) {
		// 		await Customer.findOneAndUpdate(
		// 			{ _id: order.buyer },
		// 			{ $inc: { balance: order.walletUse, rewardBalance: order.rewardUse } }
		// 		);
		// 	}

		// 	if (order.paymentMode == 'online') {
		// 		let IsPaymentSuccess = order.onlinePayment.status.findIndex(
		// 			(status) => status.status === 'completed'
		// 		);
		// 		if (IsPaymentSuccess) {
		// 			let amount = order.onlinePayment.amount;
		// 			// update buyer wallet  with order amount
		// 			let customer = await Customer.findOneAndUpdate(
		// 				{
		// 					_id: order.buyer
		// 				},
		// 				{ $inc: { balance: amount } }
		// 			);
		// 		}
		// 	}

		// 	order.rejected.status = true;
		// 	order.rejected.date = new Date();

		// 	await order.save();
		// }

		return {};
	} catch (error) {
		throw error;
	}
};

//this will run in every minutes
new CronJob(
	'*/2 * * * *',
	function () {
		rejectOrderIfSellerNotAccept();
		changeOrderStatusPackingToReady();
	},
	null,
	true
);

export const allOrders = async () => {
	try {
		let currentTime = new Date();
		let pastTime = new Date(currentTime.getTime() - 5 * 60000);
		let orders = await Order.find({
			'accepted.status': true,
			'riderAccepted.status': false,
			'accepted.date': { $gte: pastTime }
		});

		for (let i = 0; i < orders.length; i++) {
			await riderOrderAcceptance(
				{ orderId: orders[i]._id, status: 'rejected' },
				{ _id: orders[i].rider }
			);
		}
	} catch (err) {
		console.error(err);
	}
};
export const acceptOrder = async (
	data: {
		_id: string;
		amount: number;
		period: number;
	}[],
	user,
	fromAdmin = false
) => {
	try {
		if (!data || !data.length) {
			throwError(400);
		}
		const newStatus = {
			status: 'accepted' as OrderStatus,
			date: new Date(),
			remarks: '',
			by: user._id
		};
		for (let order of data) {
			let commission = generateCommission(order._id, order.amount);

			await Order.updateMany(
				{
					_id: order._id,
					...(!fromAdmin ? { seller: user._id } : {})
				},
				{
					$set: {
						currentStatus: newStatus,
						accepted: {
							status: true,
							date: new Date()
						},
						commission: commission
					},
					$push: {
						statusHistory: newStatus
					}
				},
				{ useFindAndModify: false, new: true }
			);
		}
		return {};
	} catch (error) {
		throw error;
	}
};

export const generateCommission = async (id, amount) => {
	try {
		let commission = {
			netAmt: 0,
			gst: 0,
			gstAmt: 0,
			tcs: 0,
			tcsAmt: 0,
			totalAmt: 0
		};
		let product = await NewProductModel.findById(id);
		// const currentDate = new Date();
		// const commissionEffectiveDate = new Date(product.commissionEffectiveDate);
		// const validityPeriod = 12 * 30 * 24 * 60 * 60 * 1000; // 12 months in milliseconds
		// if (currentDate.getTime() - commissionEffectiveDate.getTime() > validityPeriod) {
		// Commission is no longer valid, update the commission effective date
		// 	product.commissionEffectiveDate = currentDate;
		// 	await product.save();
		// }
		if (product.level1 == '613259a87ab02b825c33af16') {
			commission.netAmt = (amount * 2) / 100;
			commission.tcs = 1;
			commission.tcsAmt = (amount * 1) / 100;
			commission.gst = 18;
			commission.gstAmt = (amount * 18) / 100;
			commission.totalAmt = commission.netAmt + commission.tcsAmt + commission.gstAmt;
		}
		return commission;
	} catch (err) {
		throw err;
	}
};
export const readyOrders = async (
	data: {
		_id: string;
		amount: number;
		period: number;
	}[],
	user,
	fromAdmin = false
) => {
	try {
		if (!data || !data.length) {
			throwError(400);
		}
		const newStatus = {
			status: 'ready' as OrderStatus,
			date: new Date(),
			remarks: '',
			by: user._id
		};
		for (let order of data) {
			await Order.updateMany(
				{
					_id: order._id,
					...(!fromAdmin ? { seller: user._id } : {})
				},
				{
					$set: {
						currentStatus: newStatus,
						ready: {
							status: true,
							date: new Date()
						}
					},
					$push: {
						statusHistory: newStatus
					}
				},
				{ useFindAndModify: false, new: true }
			);
		}
		return {};
	} catch (error) {
		throw error;
	}
};

export const dispatchOrders = async (
	data: {
		_id: string;
		amount: number;
		period: number;
	}[],
	user,
	fromAdmin = false
) => {
	try {
		if (!data || !data.length || !data.every((o) => o._id && o.amount >= 0 && o.period >= 1)) {
			throwError(400);
		}
		const newStatus = {
			status: 'dispatch' as OrderStatus,
			date: new Date(),
			remarks: '',
			by: user._id
		};
		for (let order of data) {
			await Order.updateMany(
				{
					_id: order._id,
					...(!fromAdmin ? { seller: user._id } : {})
				},
				{
					$set: {
						'delivery.amount': order.amount,
						'delivery.period': order.period,
						currentStatus: newStatus,
						dispatched: {
							status: true,
							date: new Date()
						}
					},
					$push: {
						statusHistory: newStatus
					}
				},
				{ useFindAndModify: false, new: true }
			);
			createDispatchNotifications(order._id);
		}
		return {};
	} catch (error) {
		throw error;
	}
};

const createDispatchNotifications = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId).populate('seller', 'businessName');
		const adminNotification = createAdminNotification('ADMIN_ORDER_DISPATCHED', null, order);
		sendAdminNotification(adminNotification);
	} catch (error) {
		console.error(error);
	}
};

export const getOrdersByType = async (
	queryObj: QueryObj,
	type:
		| 'ready'
		| 'placed'
		| 'processing'
		| 'shipping'
		| 'delivered'
		| 'returned'
		| 'cancelled'
		| 'rejected'
		| 'failed',
	user
) => {
	try {
		let query = {};
		switch (type) {
			case 'placed':
				query = {
					'placed.status': true,
					'accepted.status': false,
					'ready.status': false,
					'dispatched.status': false,
					'rejected.status': false,
					'cancelled.status': false
				};
				break;
			case 'processing':
				query = {
					'accepted.status': true,
					'ready.status': false,
					'dispatched.status': false,
					'cancelled.status': false,
					'rejected.status': false
				};
				break;
			case 'ready':
				query = {
					'ready.status': true,
					'dispatched.status': false,
					'cancelled.status': false,
					'rejected.status': false
				};
				break;
			case 'shipping':
				query = {
					'dispatched.status': true,
					'delivered.status': false,
					'returned.status': false,
					'rejected.status': false
				};
				break;
			case 'delivered':
				query = {
					'delivered.status': true,
					'returned.status': false
				};
				break;
			case 'returned':
				query = {
					'returned.status': true
				};
				break;
			case 'cancelled':
				query = {
					'cancelled.status': true
				};
				break;
			case 'rejected':
				query = {
					'rejected.status': true
				};
				break;
			case 'failed':
				query = {
					'currentStatus.status': 'failed'
				};
			default:
				break;
		}

		if (queryObj.startDate && queryObj.endDate) {
			let startDate = startOfDay(new Date(queryObj.startDate));
			let endDate = endOfDay(new Date(queryObj.endDate));

			query = {
				createdAt: { $gte: startDate, $lte: endDate },
				...query
			};
		}

		const dbQuery = {
			seller: user._id,
			...query
		};

		const dbProject = {
			isGroupOrder: 1,
			buyerDetails: {
				name: 1,
				contact: 1,
				firstOrder: 1
			},
			deliveryMode: 1,
			packingTime: 1,
			deliveryCharges: 1,
			order: 1,
			items: 1,
			createdAt: 1,
			paymentMode: 1,
			dispatched: { status: 1 },
			accepted: 1,
			onlinePayment: 1,
			currentStatus: 1,
			returned: 1,
			cancelled: 1,
			rider: 1,
			commission: 1,
			couponDeduction: 1,
			couponProvidedBy: 1
		};

		const populations = [
			{
				path: 'rider',
				select: 'name contact latestLocation'
			},
			{
				path: 'items.product',
				select: 'thumbImages minPrice description'
			}
		];

		const results = await getResults(
			queryObj,
			Order,
			dbQuery,
			dbProject,
			null,
			'createdAt',
			-1,
			15,
			populations
		);
		queryObj.limit = 0;

		return results;
	} catch (error) {
		throw error;
	}
};

export const walletAndCashbackSettlement = async (order: IOrder, onlineAmount: number) => {
	try {
		let oldWallet = order.walletUse;
		let oldReward = order.rewardUse;
		let onlineAmount = order.onlinePayment.amount;
		let payableAmt = order.order.totalAmt + order.deliveryMode.charges;
		let remainWallet = order.walletUse + onlineAmount + order.rewardUse - payableAmt;
		let distributeAmounts = distributeAmount(oldWallet, oldReward, onlineAmount, payableAmt);

		let wallet = payableAmt - tf2(distributeAmounts.reward) - tf2(distributeAmounts.online);
		order.walletUse = wallet;

		order.rewardUse = tf2(distributeAmounts.reward);
		order.onlinePayment.amount = tf2(distributeAmounts.online);
		const buyer = await Customer.findOne({ _id: order.buyer });
		let onlinePaymentExceeded = onlineAmount - order.onlinePayment.amount;
		let walletCrAmt = oldWallet - order.walletUse;
		let rewardCrAmt = oldReward - order.rewardUse;
		let rewardAmount = rewardCrAmt > 0 ? rewardCrAmt : 0;
		buyer.rewardBalance += tf2(rewardAmount);
		let walletAmt = tf2(
			(onlinePaymentExceeded > 0 ? onlinePaymentExceeded : 0) +
				(walletCrAmt > 0 ? walletCrAmt : 0)
		);

		if (rewardAmount) {
			await History.create({
				type: 'reward',
				buyer: order.buyer,
				amount: rewardAmount,
				date: new Date(),
				action: 'credit',
				remark: `Parcel Rejection: ${order._id}`
			});
		}
		if (walletAmt) {
			await History.create({
				type: 'wallet',
				buyer: order.buyer,
				amount: walletAmt,
				date: new Date(),
				action: 'credit',
				remark: `Parcel Rejection: ${order._id}`
			});
		}

		buyer.balance += walletAmt;

		await buyer.save();
	} catch (e) {
		console.error(e);
	}
};

export const changeOrderStatusPackingToReady = async () => {
	try {
		const order: any = await Order.findOne({
			'currentStatus.status': 'rider_accepted'
		})
			.populate([{ path: 'seller', select: 'packingTime' }])
			.select('seller rider packingTime currentStatus statusHistory');

		if (order) {
			const dateString = order.currentStatus.date;
			const seller: any = order.seller;
			const rider: any = order.rider;

			const originalDate = new Date(dateString);

			const updatedDate = addMinutes(
				originalDate,
				+order.packingTime || +seller.packingTime || 10
			);

			// Check if the updatedDate is in the past
			if (isPast(updatedDate)) {
				// socket
				notifyOrderStatusUpdate(seller._id, rider);

				// Push the new status only if 'ready' status doesn't exist
				const isReadyStatusExist =
					order &&
					order.statusHistory &&
					order.statusHistory.some((st) => st?.status === 'ready');

				if (!isReadyStatusExist) {
					const newStatus = {
						status: 'ready',
						by: null,
						date: new Date(),
						remarks: 'Ready By Server'
					};

					order.currentStatus = newStatus;
					order['ready'] = {
						status: true,
						date: new Date()
					};
					order.statusHistory.push(newStatus);
					await order.save();
				}
			}
		}
	} catch (e) {
		console.error(e);
	}
};
export const distributeAmount = (a, b, c, totalAmount) => {
	try {
		const totalRatio = a + b + c;

		const portionA = (a / totalRatio) * totalAmount;
		const portionB = (b / totalRatio) * totalAmount;
		const portionC = (c / totalRatio) * totalAmount;

		return {
			wallet: portionA,
			reward: portionB,
			online: portionC
		};
	} catch (err) {
		console.error(err);
	}
};
export const reCalculateAmount = async (data, user) => {
	try {
		let orderId = data?.orderId;

		if (
			!(
				data?.acceptedItems?.length >= 0 ||
				data?.rejectedItems?.length >= 0 ||
				data?.itemsWithQuantity?.length >= 0
			)
		) {
			throwError(400);
		}

		//Populate the order with the products and then populate the products with the price
		const order = await Order.findById(orderId).populate({
			path: 'items.product',
			select: 'name thumbImages minPrice'
		});
		const seller = await Seller.findById('64b799a1da6908d36d9f620f').select(
			'sellerInvoiceNumber priceTable runningItems'
		);
		if (!order || !seller) {
			throwError(404);
		}
		let oldItems = order.items;

		const packingTime = data?.packingTime;
		const acceptedItems = data.acceptedItems;

		order.items = order.items.map((i) => {
			i.accepted = !!acceptedItems.find(
				(item) => item.product._id.toString() === (i.product as IProduct)._id.toString()
			);
			return i;
		});
		order.rejectedItems = order.items.filter((i) => !i.accepted);
		order.items = order.items.filter((i) => i.accepted);

		order.items = order.items.map((i) => {
			let acceptedItem = acceptedItems.find(
				(item) => item.product._id.toString() === (i.product as IProduct)._id.toString()
			);

			if (acceptedItem) {
				if (i.quantity !== acceptedItem?.availableQty) {
					let rejectedQuantity = i.quantity - acceptedItem?.availableQty;

					order.rejectedItems.push({
						commission: i.commission,
						variant: i.variant,
						itemSet: i.itemSet,
						insured: i.insured,
						accepted: i.accepted,
						rejected: i.rejected,

						product: i.product,
						itemType: i.itemType,
						quantity: rejectedQuantity,
						name: i.name,
						mainCategory: i.mainCategory,
						insurance: i.insurance,
						service: i.service,
						gst: i.gst,
						unitPrice: tf2((i.unitPrice / i.quantity) * rejectedQuantity),
						amounts: {
							main: tf2((i.amounts.main / i.quantity) * rejectedQuantity),
							net: tf2((i.amounts.net / i.quantity) * rejectedQuantity),
							gst: tf2((i.amounts.gst / i.quantity) * rejectedQuantity),
							total: tf2((i.amounts.total / i.quantity) * rejectedQuantity),
							discount: tf2((i.amounts.discount / i.quantity) * rejectedQuantity)
						},
						gstType: i.gstType,
						discount: tf2((i.discount / i.quantity) * rejectedQuantity)
					});
				}
				i.quantity = acceptedItem?.availableQty;
			} else {
				console.error(acceptedItem, i, '------');
			}
			return i;
		});

		//check so that prevent duplicate status

		if (order.rejectedItems.length > 0) {
			if (order?.coupon) {
				let coupon = await Coupon.findById(order.coupon).lean();
				if (order.couponProvidedBy === 'seller') {
					await prepareMainAmtWithCoupon(order);

					await prepareDiscountWithCoupon(
						order,
						order.couponDeduction,
						false,
						order.order.totalAmt
					);
				} else {
					await prepareItemsPrice(order);
					await prepareDiscount(order, seller, 0);

					// order.order.totalAmt = order.order.totalAmt - order.couponDeduction;
				}
			} else {
				if (acceptedItems.length) {
					await prepareItemsPrice(order);
					await prepareDiscount(order, seller, 0);
				}
			}
		}
		order.order.codAmt = 0;

		data.commission = {
			netAmt: 0,
			gst: 18,
			gstAmt: 0,
			tcs: 0,
			tcsAmt: 0,
			totalAmt: 0,
			restaurantGst: 0,
			insurance: 0,
			gstExampted: 0,
			insuredItemValue: 0,
			insuredItemCommission: 0,
			insuredRestItemValue: 0
		};
		data.order = {
			mainAmt: 0,
			mainGst: 0,
			netAmt: 0,
			gstAmt: 0,
			totalAmt: 0
		};

		for (let item of order.items) {
			let insurance = item.insured && order.deliveryMode.value == 0;

			let restaurantItem = item.service == 'Restaurant';
			let restaurantGst = item.service == 'Restaurant' ? tf2(item.amounts.net * 0.05) : 0;

			data.commission.restaurantGst += restaurantGst;
			let insu = insurance ? tf2(item.amounts.net * 0.01 * item.insurance) || 0 : 0;

			data.commission.insurance += insu;

			data.commission.insuredRestItemValue +=
				insurance && restaurantItem ? item.amounts.net : 0;
			data.commission.gstExampted += item.gstType == 'none' ? item.amounts.net : 0;
			data.commission.tcs +=
				!restaurantItem && item.gstType !== 'none' ? item.amounts.net * 0.01 : 0;

			data.commission.netAmt = tf2(data.commission.netAmt + item.commission.amounts.net);
			if (!restaurantItem && item.gstType !== 'none') {
			}
			data.commission.insuredItemCommission += insurance ? item.commission.amounts.net : 0;
			data.commission.insuredItemValue += insurance ? item.amounts.net : 0;

			data.order.mainAmt = tf2(data.order.mainAmt + item.amounts.main);
			data.order.mainGst = tf2(data.order.mainGst + item.amounts.gst + restaurantGst);
			data.order.netAmt = tf2(data.order.netAmt + item.amounts.net);
			data.order.gstAmt = tf2(data.order.gstAmt + item.amounts.gst);

			data.order.totalAmt = tf2(data.order.totalAmt + item.amounts.total + restaurantGst);
		}

		data.commission.gstAmt = tf2(data.commission.netAmt * 0.01 * data.commission.gst);
		data.commission.totalAmt = tf2(data.commission.netAmt + data.commission.gstAmt);

		order.commission = data.commission;
		const runningItems = seller.runningItems || [];

		if (acceptedItems.length) {
			await seller.save();
		}
		let onlineAmount = 0;

		order.packingTime = packingTime || 0;

		if (order.paymentMode == 'online') {
			let IsPaymentSuccess = order.onlinePayment.status.findIndex(
				(status) => status.status === 'completed'
			);
			if (IsPaymentSuccess) {
				onlineAmount = order.onlinePayment.amount;
			}
		}

		await order.save();
		if (!order?.rejected?.status) {
			if (order.coupon) {
				await applyCoupon(order.buyer);
			}

			sendTurnInNotifications(order._id.toString());
		}

		return order;
	} catch (error) {
		throw error;
	}
};
