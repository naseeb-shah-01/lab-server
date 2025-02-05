import { throwError } from '../../helpers/throw-errors';
import { IOrder, IOrderItem, OrderStatus } from '../../models/order/order';
import { IGroupOrder } from '../../models/order/group-order';
import { model, Types } from 'mongoose';
import { IProduct } from '../../models/seller/product';
import { tf0, tf2 } from '../../helpers/number';
import { ICustomer } from '../../models/customer/customer';
import { ICategory } from '../../models/category/category';
import PaytmChecksum from 'paytmchecksum';
import config from '../../../config.json';
const History = model<IHistory>('History');
import { ICart } from '../../models/customer/cart';
import { createSellerNotification } from '../../helpers/notifications/seller';
import { createAdminNotification } from '../../helpers/notifications/admin';
import { IUser } from '../../models/user/user';
import { createBuyerNotification } from '../../helpers/notifications/buyer';
import { setCustomerType } from './customer';
import { INotification } from '../../models/notification/notification';

import {
	sendAdminNotification,
	sendBuyerNotification,
	sendRiderNotification,
	sendSellerNotification
} from '../../helpers/notifications/notification';
import { turnInOrder } from '../seller/orders';

import { checkAndNotifyCartChange } from './cart';
import { IPrice } from '../../models/seller/price';
import axios, { AxiosRequestConfig } from 'axios';
import { createRiderNotification } from '../../helpers/notifications/rider';
import { IRider } from '../../models/rider/rider';
import {
	calculateDistance,
	findBestRoute,
	getDistanceWithGoogle
} from '../../helpers/calculateDistance';
import { ISeller } from '../../models/customer/seller';
import { orderListQuery } from '../users/order-query';
import { ICoupon } from '../../models/customer/coupons';
import { IVersion } from '../../models/general/version';
import { changeOrderStatus } from '../users/orders';
import { ISellerCategory } from '../../models/seller/seller-category';
import { IAreas } from '../../models/locations/goodAreas';
import { ITopUpOrder } from '../../models/order/topUpOrder';
import { notifyOrderStatusUpdate } from '../rider/orders';
import { getStripText } from '../../helpers/strip-text';
import { sendSellerWhatsappSms } from '../webhook/webhook';
import { addMinutes } from 'date-fns';
import { sendNewOrderMessageToDiscord } from '../discord/discord_webhook';
import { IHistory } from '../../models/general/history';
import { sellerSettelement } from '../general/settlement';
import { json } from "body-parser";

const GroupOrder = model<IGroupOrder>('GroupOrder');
const Price = model<IPrice>('Price');
const Version = model<IVersion>('Version');
const SellerCategory = model<ISellerCategory>('SellerCategory');
const NewProduct = model<IProduct>('NewProduct');
const Customer = model<ICustomer>('Customer');
const User = model<IUser>('User');
const Order = model<IOrder>('Order');
const Cart = model<ICart>('Cart');
const Notification = model<INotification>('Notification');
const Rider = model<IRider>('Rider');
const Seller = model<ISeller>('NewCustomer');
const Coupon = model<ICoupon>('Coupon');
const Area = model<IAreas>('Areas');
const TopUpOrder = model<ITopUpOrder>('TopUpOrder');

async function prepareOrders(dataArray: IOrder[], user: any): Promise<IOrder[] | any> {
	const orderArray: Partial<IOrder>[] = [];

	for (const data of dataArray) {
		// Perform async operations
		await prepareItems(data);
		await prepareMainAmt(data);
		await prepareDiscount(data);
		await prepareTokenAndCODAmt(data);

		const returnPeriods = data.items
			.filter((i) => i.returnPeriod >= 0)
			.map((i) => i.returnPeriod);
// find shop related data

let shop=  await Seller.findById(data.seller).select("businessName")


		const order: Partial<IOrder> = {
			seller: data.seller,
			buyer: data.buyer,
			isGroupOrder: data.isGroupOrder,
            shop:shop.businessName,
			groupOrder: null,
			runningDuration: data.runningDuration,
			paymentMode: data.paymentMode,
			order: data.order,
			delivery: {
				amount: null,
				period: 15
			},
			returnPeriod: returnPeriods.length
				? returnPeriods.reduce((min, i) => (min > i ? i : min), returnPeriods[0])
				: 0,
			items: data.items.map((item) => ({
				...item,
				product: {
					_id: (item.product as IProduct)._id,
					thumbImages: (item.product as IProduct).thumbImages?.length
						? [(item.product as IProduct).thumbImages[0]]
						: []
				} as IProduct
			})),
			commission: data.commission
		};

		// Remove old coupon

		const detailsBreakup = {
			withDiscountAmt: order.order.totalAmt,
			discountAll: 0,
			gstAll: data.order.gstAmt,
			restaurantGst: data.commission.restaurantGst
		};

		// Calculate COD block

		// Add the finalized order to the array
		orderArray.push({
			...order,
			...detailsBreakup
		});
	}

	return orderArray;
}

export const createOrder = async (data: IOrder & Record<string, any>, user) => {
	try {
		data.forEach((order: IOrder) => {
			order.buyer = user._id;
			console.log(order, 'order');
			if (
				!order ||
				!order.seller ||
				!['online-cod', 'cod', 'online'].includes(order.paymentMode) ||
				!order.items ||
				!order.items.length
			) {
				console.log('sai is here');
				return throwError(400);
			}
		});

		await Customer.updateOne(
			{ _id: user._id },
			{
				$set: {
					appliedCoupon: null
				}
			}
		);
		setCustomerType(user._id, 'buyer');
		let orderData = await prepareOrders(data, user);
		console.log(orderData, 'order data');
		return orderData;

		// if (data.isGroupOrder === true) {
		// 	data.groupOrderTotal = await prepareGroupOrder(data);
		// } else {
		// 	data.isGroupOrder = false;
		// 	data.groupOrderTotal = 0;
		// }

		await prepareItems(data);

		await prepareMainAmt(data);

		await prepareDiscount(data);
		await prepareTokenAndCODAmt(data);

		setCustomerType(user._id, 'buyer');

		const returnPeriods = data.items
			.filter((i) => i.returnPeriod >= 0)
			.map((i) => i.returnPeriod);

		const order: Partial<IOrder> = {
			seller: data.seller,
			buyer: data.buyer,
			isGroupOrder: data.isGroupOrder,
			groupOrder: null,
			runningDuration: data.runningDuration,
			paymentMode: data.paymentMode,
			order: data.order,
			delivery: {
				amount: null,
				period: 15
			},
			returnPeriod: returnPeriods.length
				? returnPeriods.reduce((min, i) => (min > i ? i : min), returnPeriods[0])
				: 0,
			items: data.items.map((item) => ({
				...item,
				product: {
					_id: (item.product as IProduct)._id,
					thumbImages: (item.product as IProduct).thumbImages?.length
						? [(item.product as IProduct).thumbImages[0]]
						: []
				} as IProduct
			})),
			commission: data.commission
		};

		//  remove old coupon
		await Customer.updateOne(
			{ _id: data.buyer },
			{
				$set: {
					appliedCoupon: null
				}
			}
		);

		let detailsBreakup = {
			withDiscountAmt: order.order.totalAmt,
			discountAll: 0,
			gstAll: data.order.gstAmt,
			restaurantGst: data.commission.restaurantGst
		};

		// let customer = await Customer.findOne({ _id: data.buyer })
		// 	.select('addresses balance rewardBalance name email contact codBlock')
		// 	.lean();

		// let seller = await Seller.findOne({ _id: data.seller })
		// 	.select('shopLocation deliveryMode')
		// 	.lean();

		// let sellerCoor = seller.shopLocation.coordinates;
		// let deliveredAddresses = [];
		// customer.addresses.forEach((add: any) => {
		// 	let buyerCoor = add.location.coordinates;
		// 	let distance = calculateDistanceTwo(
		// 		buyerCoor[1],
		// 		buyerCoor[0],
		// 		sellerCoor[1],
		// 		sellerCoor[0]
		// 	);
		// 	let newAdd = {
		// 		...add,
		// 		disable: distance > 10
		// 	};
		// 	deliveredAddresses.push(newAdd);
		// });

		// let buyerAddresses = deliveredAddresses;

		// delete customer.addresses;
		// if order includes  300 reupee restaurant items or order total greater than 500
		let codBlock = false;
		if (order.commission.restaurantGst > 50 || order.order.totalAmt > 1500) {
			codBlock = true;
		}

		return {
			...order,
			...detailsBreakup,
			codBlock
		};
	} catch (error) {
		throw error;
	}
};

const prepareGroupOrder = async (data: IOrder & Record<string, any>) => {
	const groupOrder = await GroupOrder.findOne({
		seller: data.seller,
		completed: false,
		endDate: { $gte: new Date() }
	});
	if (groupOrder) {
		return groupOrder.toJSON().total;
	}
	return 0;
};

export const prepareItems = async (data: IOrder) => {
	let seller = data.seller.toString();
	let categories = await SellerCategory.find({ level: 1 });

	for (let item of data.items) {
		const product: IProduct = JSON.parse(
			JSON.stringify(await NewProduct.findById(item.product))
		);

		let mainCategory: any = categories.find((c: any) => c._id.toString() === product.level1);

		item.product = product;
		item.product.minPrice = product.minPrice;

		item.name = product.name;
		item.mainCategory = mainCategory?._id;
		item.returnPeriod = mainCategory?.returnPeriod;
		item.commission = mainCategory?.commission;
		item.insurance = mainCategory?.insurance || 0;
		item.itemType = product.type;
		item.insured = mainCategory?.insured;
		item.service = mainCategory?.isRestaurantService ? 'Restaurant' : 'Non-Restaurant';
		item.commission = {
			percentage: mainCategory?.commission,
			gst: 18,
			tcs: 0,
			amounts: {
				net: 0,
				gst: 0,
				tcs: 0,
				total: 0
			}
		};
	}
};

const prepareMainAmt = async (data: IOrder) => {
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

		// Items price without GST
		item.amounts.net = tf2(item.amounts.main); //
		item.gstType = minPrice.gstType; // [Inclusive, Exclusive, No GST]
		item.gst = minPrice.gst; // GST percentage
		item.amounts.margin = 0;
		item.amounts.gst = tf2(item.quantity * minPrice.gstValue); // GST Value
		item.amounts.total = tf0(item.amounts.net + item.amounts.gst); // Total amount of item
		let restaurantGst = item.service == 'Restaurant' ? tf2(item.amounts.net * 0.05) : 0;

		data.commission.restaurantGst += restaurantGst;
		data.order.mainAmt = tf2(data.order.mainAmt + item.amounts.main);
		data.order.mainGst = tf2(data.order.mainGst + item.amounts.gst + restaurantGst);
		data.order.netAmt = tf2(data.order.netAmt + item.amounts.net);
		data.order.gstAmt = tf2(data.order.gstAmt + item.amounts.gst);
		data.commission.restaurantGst = tf2(data.commission.restaurantGst + restaurantGst);
		data.order.totalAmt = tf2(data.order.totalAmt + item.amounts.total + restaurantGst);
	}
};

const prepareDiscount = async (data: IOrder & Record<string, any>) => {
	const totalAmt = data.groupOrderTotal + data.order.mainAmt + data.order.mainGst;
	const seller = await Seller.findById(data.seller);
	let discount = 0;
	data.priceTable = [];
	if (seller?.priceTable && seller?.priceTable?.length) {
		data.priceTable = seller.priceTable;
		const priceTable = [...seller.priceTable].sort((a, b) => a.price - b.price);
		if (totalAmt >= priceTable[0].price) {
			let index = 0;
			for (let [i, item] of priceTable.entries()) {
				if (item.price > totalAmt) {
					break;
				}
				index = i;
			}
			if (data.isGroupOrder === false) {
				discount = 0;
			} else {
				if (totalAmt === priceTable[index].price || index === priceTable.length - 1) {
					discount = priceTable[index].discount;
				} else {
					const baseDisc = priceTable[index].discount;
					const totalAmtDiff = priceTable[index + 1].price - priceTable[index].price;
					const amtDiff = totalAmt - priceTable[index].price;
					const discDiff = priceTable[index + 1].discount - priceTable[index].discount;
					const disc = (amtDiff * discDiff) / totalAmtDiff;
					const finalDisc = tf2(baseDisc + disc);
					discount = finalDisc > 0 ? finalDisc : 0;
				}
			}
		}
	}

	data.order = {
		mainAmt: 0,
		mainGst: 0,
		discount: discount,
		discountAmt: 0,
		netAmt: 0,
		gstAmt: 0,
		totalAmt: 0
	};
	data.commission = { restaurantGst: 0, insurance: 0 };

	for (let item of data.items) {
		let insured = item.insured;
		item.discount = calculateItemDiscountPercentage(item, discount);
		item.amounts.discount = tf2(item.amounts.main * 0.01 * item.discount);
		const itemMainGst = tf2(item.amounts.main * 0.01 * item.gst);
		item.amounts.net = tf2(item.amounts.main - item.amounts.discount);
		item.amounts.gst = tf2(item.amounts.net * 0.01 * item.gst);
		item.amounts.total = tf0(item.amounts.net + item.amounts.gst);
		data.order.mainAmt = tf2(data.order.mainAmt + item.amounts.main);
		data.order.mainGst = tf2(data.order.mainGst + itemMainGst);
		data.order.discountAmt = tf2(data.order.discountAmt + item.amounts.discount);
		data.order.netAmt = tf2(data.order.netAmt + item.amounts.net);
		let restaurantGst = item.service == 'Restaurant' ? tf2(item.amounts.net * 0.05) : 0;

		data.commission.insurance += insured ? item.amounts.net * 0.001 * item.insurance : 0;
		data.order.gstAmt = tf2(data.order.gstAmt + item.amounts.gst + restaurantGst);
		data.commission.restaurantGst += restaurantGst;
		data.order.totalAmt = tf2(data.order.totalAmt + item.amounts.total + restaurantGst);
	}

	data.order.discount = tf2(100 * (data.order.discountAmt / data.order.mainAmt));
};

const calculateItemDiscountPercentage = (item: IOrderItem, discount: number): number => {
	if (!item.amounts.margin) {
		const finalPrice = (item.product as IProduct).minPrice.sellingPrice * item.quantity;
		return tf2(100 * (1 - finalPrice / item.amounts.total));
	}
	const discountOnMargin = item.amounts.margin * 0.01 * discount;
	const finalPrice =
		((item.product as IProduct).minPrice.sellingPrice - discountOnMargin) * item.quantity;
	return tf2(100 * (1 - finalPrice / item.amounts.total));
};

const prepareTokenAndCODAmt = async (data: IOrder & Record<string, any>) => {
	const tokenPercent =
		2 +
		(data.priceTable.length
			? data.priceTable.reduce((total, i) => total + i.discount, 0) / data.priceTable.length
			: 0);
	data.order.tokenAmt = tf2(data.order.totalAmt * 0.01 * tokenPercent);
	data.order.codAmt = tf2(data.order.totalAmt - data.order.tokenAmt);
};

export const placeOrder = async (orderDetails: any, user) => {
	try {
		// Find the customer by user ID
		let customer = await Customer.findOne({ _id: user._id });
		if (!customer) {
			console.log("Buyer not found");
			throwError(400);
		}
console.log(JSON.stringify(orderDetails))
		let orders = [];
		

		for (let i = 0; i < orderDetails.data.length; i++) {
			const data = orderDetails.data[i];
			if (
				!data ||
				!data.seller ||
				!['online-cod', 'cod', 'online', 'wallet'].includes(data.paymentMode) ||
				!data.items ||
				!data.items.length ||
				!data.buyerDetails ||
				!data.buyerDetails.billingAddress ||
				!data.buyerDetails.shippingAddress
			) {
                console.log(data)
                console.log("firtst block")
				throwError(400);
			}

			let couponBySeller = false;
			if (data?.coupon) {
				let orderCoupon = await Coupon.findOne({ _id: data.coupon });
				if (orderCoupon?.providedBy === 'seller') {
					couponBySeller = true;
				}
				orderCoupon.globalUseCount += 1;
				await orderCoupon.save();
			}

			const orderData: Partial<IOrder> = {
				// Order data preparation (same as in your original code)
				// ...
				items: data.items.map((item) => {
					const commission = {
						percentage: item.commission.percentage || 0,
						gst: 18,
						amounts: { net: 0, gst: 0, total: 0 }
					};
					if (couponBySeller) {
						commission.amounts.net = tf2(
							(item.amounts.net + item.amounts.discount) * 0.01 * item.commission.percentage
						);
					} else {
						commission.amounts.net = tf2(
							item.amounts.net * 0.01 * item.commission.percentage
						);
					}
					commission.amounts.gst = tf2(commission.amounts.net * 0.01 * commission.gst);
					commission.amounts.total = tf0(commission.amounts.net + commission.amounts.gst);
					item.commission = commission;
					item.accepted = false;
					item.rejected = false;
					return item;
				}),
				// Additional order data fields
			};

			await prepareSellerDetails(orderData as IOrder);
			await prepareBuyerDetails(orderData as IOrder);
			await prepareAmounts(orderData as IOrder, data?.totalPayable || 0);

			const seller = await Seller.findById(data.seller);
			orderData.commission.discountBy = couponBySeller ? 'seller' : 'platform';
			orderData.deliveryCharges = orderData.deliveryMode.value;
			orderData.currentStatus = {
				status: data.paymentMode === 'cod' ? 'placed' : 'checkout_pending',
				date: new Date(),
				remarks: '',
				by: user._id
			};
			if (data.paymentMode === 'cod') {
				orderData.placed = { status: true, date: new Date() };
			}

			const timeMin = reverseConvertTime(extractTimeFromString(orderData.deliveryMode.details));
			orderData.ETA = addMinutes(new Date(), +timeMin);

			orderData.statusHistory.push(orderData.currentStatus);
			const order = new Order(orderData);

			if (['online', 'online-cod'].includes(orderData.paymentMode)) {
				const paytmOrder = await preparePaytmOrder(order);
				order.onlinePayment.orderId = paytmOrder.body.txnToken;
			}

			customer.orderCount = {
				total: (customer.orderCount?.total || 0) + 1,
				pending: (customer.orderCount?.pending || 0) + 1
			};

					order.buyerDetails.firstOrder = customer.orderCount.total === 1;
			if (order) {
				order.couponDeduction = +data.couponDeduction || 0;
				order.couponProvidedBy = data.couponProvidedBy || null;
			}
			order.freeDeliveryAmt = seller?.deliveryMode?.platform?.freeDeliveryAmount;

			await order.save();
			if (order.paymentMode === 'cod') {
				setTimeout(() => {
					completeOrderPlacement(order._id);
				}, 100);
			}

			seller.orders.total += 1;
			await seller.save();

			orders.push(order);
		}
        customer.balance -= orderDetails.walletUse || 0;
        customer.rewardBalance -= orderDetails.rewardUse || 0;

        if (data?.walletUse) {
            await History.create({
                buyer: customer._id,
                type: 'wallet',
                amount: data.walletUse,
                date: new Date(),
                action: 'debit',
                remark: `Order Placed: ${order._id}`
            });
        }
        if (data.rewardUse) {
            await History.create({
                type: 'reward',
                buyer: customer._id,
                amount: data.rewardUse,
                date: new Date(),
                action: 'debit',
                remark: `Order Placed: ${order._id}`
            });
        }

        await customer.save();


		console.log(orders, "Order last is here");
		return orders[0];
	} catch (error) {
		throw error;
	}
};

export const checkRecentOrders = async (user) => {
	const orders = await Order.find(
		{
			buyer: user._id,
			'dispatched.status': true
		},
		{ abandoned: 1 }
	)
		.sort({ _id: -1 })
		.limit(3);

	for (let i = 0; i < orders.length; i++) {
		if (orders[i].abandoned?.status) return { disableCOD: true };
	}

	return { disableCOD: false };
};

const prepareSellerDetails = async (data: IOrder) => {
	const seller = await Seller.findById(data.seller);

	let contactNumber;
	if (seller && seller?.managerNumber) {
		contactNumber = seller.managerNumber;
	} else {
		contactNumber = seller.contact;
	}

	data.sellerDetails = {
		gst: seller.gst,
		name: seller.businessName,
		contact: contactNumber,
		shopLocation: seller.shopLocation,
		billingAddress: seller.addresses
			? seller.addresses.find((adr) => adr.billing) ||
			  seller.addresses.find((adr) => adr.primary) ||
			  seller.addresses[0]
			: {
					line1: '',
					line2: '',
					state: '',
					city: '',
					pincode: ''
			  }
	};
};

const prepareBuyerDetails = async (data: IOrder) => {
	const buyer = await Customer.findById(data.buyer);
	data.buyerDetails = {
		gst: buyer.gst,
		name: buyer.name,
		contact: buyer.contact,
		billingAddress: data.buyerDetails.billingAddress,
		shippingAddress: data.buyerDetails.shippingAddress
	};
};

const prepareAmounts = async (data: IOrder, totalPayable) => {
	let packingCharges = data.packingCharges;
	data.onlinePayment = {
		paymentId: null,
		orderId: null,
		signature: null,
		amount: 0,
		status: []
	};

	data.codPayment = {
		amount: 0,
		completed: false,
		date: null,
		remarks: null,
		by: null
	};
	if (data.paymentMode === 'online') {
		data.onlinePayment.amount = totalPayable;
		data.onlinePayment.status = [
			{
				status: 'pending',
				date: new Date(),
				remarks: 'full'
			}
		];
	} else if (data.paymentMode === 'online-cod') {
		data.onlinePayment.amount = data.order.tokenAmt;
		data.onlinePayment.status = [
			{
				status: 'pending',
				date: new Date(),
				remarks: 'token'
			}
		];
		data.codPayment.amount = data.order.codAmt;
	} else if (data.paymentMode === 'cod') {
		data.codPayment.amount = totalPayable;
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

	for (let item of data.items) {
		let insurance = item.insured && data.deliveryMode.value == 0;
		let orderCoupon = await Coupon.findOne({ _id: data.coupon });
		if (orderCoupon?.type !== 'delivery') {
		}
		let restaurantItem = item.service == 'Restaurant';
		let restaurantGst = item.service == 'Restaurant' ? tf2(item.amounts.net * 0.05) : 0;

		data.commission.restaurantGst += restaurantGst;
		let insu = insurance ? tf2(item.amounts.net * 0.01 * item.insurance) || 0 : 0;

		data.commission.insurance += insu;

		data.commission.insuredRestItemValue += insurance && restaurantItem ? item.amounts.net : 0;
		data.commission.gstExampted += item.gstType == 'none' ? item.amounts.net : 0;
		data.commission.tcs +=
			!restaurantItem && item.gstType !== 'none' ? item.amounts.net * 0.01 : 0;

		data.commission.netAmt = tf2(data.commission.netAmt + item.commission.amounts.net);
		if (!restaurantItem && item.gstType !== 'none') {
		}
		data.commission.insuredItemCommission += insurance ? item.commission.amounts.net : 0;
		data.commission.insuredItemValue += insurance ? item.amounts.net : 0;
	}

	data.commission.gstAmt = tf2(data.commission.netAmt * 0.01 * data.commission.gst);
	data.commission.totalAmt = tf2(
		data.commission.netAmt + data.commission.gstAmt + data.commission.restaurantGst
	);

	data.refund = {
		amount: 0,
		completed: false,
		date: null,
		remarks: null,
		by: null
	};
};

const preparePaytmOrder = async (data: IOrder) => {
	let paytmParams: any = {};

	paytmParams.body = {
		requestType: 'Payment',
		mid: config.paytm.paytm_mid,
		websiteName: config.paytm.paytm_website,
		orderId: data._id.toString(),
		callbackUrl: config.paytm.paytm_callback_url + `?ORDER_ID=${data._id}`,
		txnAmount: {
			value: tf2(data.onlinePayment.amount).toString(),
			currency: 'INR'
		},
		userInfo: {
			custId: data.buyer.toString()
		},
		enablePaymentMode: [{ mode: 'UPI', channels: ['UPI', 'UPIPUSH', 'UPIPUSHEXPRESS'] }]
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
		url: `${config.paytm.paytm_host}theia/api/v1/initiateTransaction?mid=${
			config.paytm.paytm_mid
		}&orderId=${data._id.toString()}`,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(postData)
		},
		data: postData
	};

	const paytmTransaction = await axios(options);

	return paytmTransaction.data;
};

export const assignRider = async (order: IOrder) => {
	try {
		// Find all approved riders in the serviceable area
		if (order?.rider) {
			return;
		}
		let activeRiderVersion = await Version.findOne({
			appName: 'rider-mobile',
			latest: true
		}).select('metadata');
		let maxOrderPerRider = activeRiderVersion?.metadata?.maxOrderPerRider || 1;
		if (order.deliveryMode.value == 1) {
			const rider = await Rider.findOne({
				status: 'active',
				approved: true,
				sellerApproved: true,
				available: true,
				seller: order.seller
			});
			if (rider?.available) {
				order.rider = rider?._id;
				await order.save();
				rider.activeOrders.push(order._id);
				await rider.save();
			} else {
				rejectOrderDueToRider(order);
			}

			return;
		}

		const riders = await Rider.find({
			status: 'active',
			approved: true,
			latestLocation: {
				$near: {
					$geometry: {
						type: 'Point',
						coordinates: order.sellerDetails.shopLocation.coordinates
					},
					$maxDistance: 10000,
					$minDistance: 0
				}
			}
		});

		//Find the nearest available (on duty) rider who is not delivering an order
		let availableRider = riders.find((el) => el.activeOrders?.length == 0 && el.available);

		if (availableRider) {
			let sellerLocation = order.sellerDetails.shopLocation.coordinates;
			let riderlocation = availableRider.latestLocation.coordinates;
			let buyerLocation = order.buyerDetails.shippingAddress.location.coordinates;
			let distance = await getDistanceWithGoogle(
				[riderlocation[1], riderlocation[0], sellerLocation[1], sellerLocation[0]],
				[sellerLocation[1], sellerLocation[0], buyerLocation[1], buyerLocation[0]]
			);
			order.distanceTraveled.riderToSeller = distance.distance1;

			order.distanceTraveled.buyerToSeller = distance.distance2;
			order.distanceTraveled.totalDistance =
				order.distanceTraveled.buyerToSeller + order.distanceTraveled.riderToSeller;
			order.rider = availableRider._id;

			await order.save();

			availableRider.activeOrders.push(order._id);
			availableRider.save();
			return;
		}

		// If no such rider is available, then find the rider whose destination for the previous order
		// is nearest to the shop location of the current order
		let nearestRider: IRider;

		let min = Number.POSITIVE_INFINITY;
		for (let i = 0; i < riders.length; i++) {
			if (riders[i].activeOrders.length <= maxOrderPerRider)
				if (riders[i].available) {
					let distanceToTravel = await calculateDistance(
						(riders[i] as IRider)._id.toString()
					);
					if (min > distanceToTravel) {
						min = distanceToTravel;
						nearestRider = riders[i];
					}
				}
		}

		const res = await Rider.findByIdAndUpdate(nearestRider?._id, {
			$push: { activeOrders: order._id }
		});
		order.rider = nearestRider?._id;
		if (nearestRider?._id) {
			let sellerLocation = order.sellerDetails.shopLocation.coordinates;
			let riderlocation = nearestRider.latestLocation.coordinates;
			let buyerLocation = order.buyerDetails.shippingAddress.location.coordinates;
			let distance = await getDistanceWithGoogle(
				[riderlocation[1], riderlocation[0], sellerLocation[1], sellerLocation[0]],
				[sellerLocation[1], sellerLocation[0], buyerLocation[1], buyerLocation[0]]
			);
			order.distanceTraveled.riderToSeller = distance.distance1;
			order.distanceTraveled.buyerToSeller = distance.distance2;
			order.distanceTraveled.totalDistance =
				order.distanceTraveled.buyerToSeller + order.distanceTraveled.riderToSeller;
		}
		if (!nearestRider?._id) {
			global.io.emit('isDeliveryAvailable', {
				available: false,
				text: getStripText()
			});
			rejectOrderDueToRider(order);
		}
		await order.save();
		let deliveryWorking = checkNextOrderRiderAvailable();
		if (!deliveryWorking) {
			let available = false;
			global.io.emit('isDeliveryAvailable', {
				available,
				text: getStripText()
			});
		}
	} catch (error) {
		console.error(error);
		throwError(404, 'Unable to locate or assign Rider');
	}
};

export const completeOrderPlacement = async (orderId: string) => {
	try {
		const order = await Order.findById(orderId);
		if (order && !order.processed) {
			order.processed = true;
			// assign rider to order
			// await assignRider(order);

			await order.save();
			// line 775 and 776  commented for testing purposes
			notifyOrderStatusUpdate(order.seller, null);
			createTurnInNotifications(order._id);
			removeItemsFromCart(order._id);
			// reduceItemsStock(order._id);
			let formattedOrderForTurnIn = {
				acceptedItems: order.items.map((item) => {
					return {
						...item,
						product: item.product,
						itemType: item.itemType,
						availableQty: item.quantity || 1000
					};
				}),
				rejectedItems: [],
				itemsWithQuantity: order.items.map((item) => {
					return {
						...item,
						product: item.product,
						itemType: item.itemType,
						initialQty: 1000,
						availableQty: 1000
					};
				})
			};

			//  Turn in immediately after placing order (By pass turn in)
			// await turnInOrder(order._id, formattedOrderForTurnIn, order.seller);
		}
	} catch (error) {
		throw error;
	}
};

const createTurnInNotifications = async (orderId) => {
	try {
		const order = await Order.findById(orderId, 'order buyer seller')
			.populate('buyer', 'name contact')
			.populate('seller', 'businessName contact')
			.populate('items')
			.lean();
		if (order) {
			const sellerNotification = createSellerNotification(
				order.isGroupOrder ? 'SELLER_GROUP_ORDER_PLACED' : 'SELLER_SINGLE_ORDER_PLACED',
				(order.seller as ISeller)._id.toString(),
				order
			);
			sendSellerNotification(sellerNotification);
			sendSellerWhatsappSms(order); //sending whatsapp msg to seller

			const buyerNotification = createBuyerNotification(
				'BUYER_ORDER_PLACED',
				(order.buyer as ICustomer)._id.toString(),
				order
			);
			sendBuyerNotification(buyerNotification);

			// const riderNotification = createRiderNotification(
			// 	'RIDER_ORDER_RECEIVED',
			// 	(order.rider as IRider)._id.toString(),
			// 	order
			// );
			// sendRiderNotification(riderNotification);

			const adminNotification = createAdminNotification(
				order.isGroupOrder ? 'ADMIN_GROUP_TURN_IN_REQUEST' : 'ADMIN_SINGLE_TURN_IN_REQUEST',
				null,
				order
			);
			sendAdminNotification(adminNotification);
			await sendNewOrderMessageToDiscord(order);
		}
	} catch (error) {
		console.error('Cannot create turn in notifcations for order ', orderId, ' : ', error);
	}
};

export const cancelOrderPlacement = async (orderId: string, user) => {
	try {
		const order = await Order.findOne({
			_id: orderId,
			buyer: user._id
		});
		if (!order) {
			throwError(404);
		}
		if (
			(order.paymentMode === 'online' || order.paymentMode === 'online-cod') &&
			!order.onlinePayment?.paymentId &&
			!order.onlinePayment.status.find((st) => st.status === 'completed') &&
			!order.onlinePayment.status.find((st) => st.status === 'captured') &&
			!order.onlinePayment.status.find((st) => st.status === 'failed')
		) {
			await failedPaytmOrderPayment(orderId, null, null);
		}
	} catch (error) {
		throw error;
	}
};

export const capturedPaytmOrderPayment = async (paytmOrderId, paytmTxnId, signature) => {
	const [order, walletTopUp] = await Promise.all([
		Order.findById(paytmOrderId),
		TopUpOrder.findById(paytmOrderId)
	]);
	if (order) {
		if (!order.onlinePayment.status.find((st) => st.status === 'completed')) {
			order.onlinePayment.paymentId = paytmTxnId;
			order.onlinePayment.signature = signature;
			order.onlinePayment.status = order.onlinePayment.status.filter(
				(st) => st.status !== 'failed'
			);
			order.onlinePayment.status.push({
				status: 'completed',
				date: new Date()
			});
			await order.save();
		}
		if (!order.onlinePayment.status.find((st) => st.status === 'captured')) {
			order.onlinePayment.status = order.onlinePayment.status.filter(
				(st) => st.status !== 'failed'
			);
			order.onlinePayment.status.push({
				status: 'captured',
				date: new Date()
			});
			await order.save();
		}
		if (!order.statusHistory.find((st) => st.status === 'placed')) {
			order.currentStatus = {
				status: 'placed',
				date: new Date(),
				remarks: ''
			};
			order.statusHistory = order.statusHistory.filter((st) => st.status !== 'failed');
			order.statusHistory.push(order.currentStatus);
			order.placed = {
				status: true,
				date: new Date()
			};
			await order.save();
		}
		if (!order.processed) {
			completeOrderPlacement(order._id.toString());
		}
	} else if (walletTopUp && walletTopUp.status !== 'completed') {
		const buyer = await Customer.findById(walletTopUp.buyer);
		if (buyer) {
			buyer.balance += walletTopUp.amount;
			await buyer.save();
			walletTopUp.status = 'completed';
			await walletTopUp.save();

			await History.create({
				type: 'wallet',
				buyer: buyer._id,
				amount: walletTopUp.amount,
				date: new Date(),
				action: 'credit',
				remark: 'Add Amount to Wallet'
			});
		}
	}
};

export const failedPaytmOrderPayment = async (paytmOrderId, paytmTxnId, signature) => {
	const [order, walletTopUp] = await Promise.all([
		Order.findById(paytmOrderId),
		TopUpOrder.findById(paytmOrderId)
	]);
	if (order) {
		if (
			(!order.onlinePayment.status.find((st) => st.status === 'completed') &&
				!order.onlinePayment.status.find((st) => st.status === 'captured') &&
				!order.onlinePayment.status.find((st) => st.status === 'failed')) ||
			!order.onlinePayment.paymentId
		) {
			if (paytmTxnId) {
				order.onlinePayment.paymentId = paytmTxnId;
				order.onlinePayment.signature = signature;
			}
			if (!order.onlinePayment.status.find((st) => st.status === 'failed')) {
				order.onlinePayment.status.push({
					status: 'failed',
					date: new Date()
				});
			}
			await order.save();
		}
		if (
			!order.statusHistory.find((st) => st.status === 'failed') &&
			!order.statusHistory.find((st) => st.status === 'placed')
		) {
			order.currentStatus = {
				status: 'failed',
				date: new Date(),
				remarks: 'payment failed'
			};
			order.placed = {
				status: false,
				date: null
			};
			order.statusHistory.push(order.currentStatus);
			if (order.walletUse || order.rewardUse) {
				if (order?.walletUse) {
					await History.create({
						type: 'wallet',
						buyer: order.buyer,
						amount: order?.walletUse,
						date: new Date(),
						action: 'credit',
						remark: `Order Failed: ${order._id}`
					});
				}
				if (order.rewardUse) {
					await History.create({
						type: 'reward',
						buyer: order.buyer,
						amount: order.rewardUse,
						date: new Date(),
						action: 'credit',
						remark: `Order Failed: ${order._id}`
					});
				}
				let buyerUpdate = await Customer.updateOne(
					{ _id: order.buyer },
					{
						$inc: {
							balance: order.walletUse,
							rewardBalance: order.rewardUse
						}
					}
				);
			}

			await order.save();
		}
	} else if (walletTopUp) {
		walletTopUp.status = 'failed';
		await walletTopUp.save();
	}
};

export const removeItemsFromCart = async (orderId) => {
	try {
		const order = await Order.findById(orderId);
		let cartChanged = false;
		if (order) {
			for (let item of order.items) {
				const cartItem = await Cart.findOne({
					buyer: order.buyer,
					product: item.product
				});
				if (cartItem) {
					await cartItem.delete();
					cartChanged = true;
				}
			}
			cartChanged ? checkAndNotifyCartChange(order.buyer as string) : null;
		}
	} catch (error) {
		console.error('Cannot clear cart items for order ', orderId, ' : ', error);
	}
};

export const reduceItemsStock = async (orderId) => {
	try {
		const order = await Order.findById(orderId);
		if (order) {
			for (let item of order.items) {
				const price = await NewProduct.findOne({
					_id: item.product
				});
				if (price) {
					const newStock =
						price.currentStock - item.quantity > 0
							? price.currentStock - item.quantity
							: 0;
					price.currentStock = newStock;
					price.save();
				}
			}
		}
	} catch (error) {
		console.error('Cannot update product stock ', orderId, ' : ', error);
	}
};
export const getRiderAvailablity = async (sellerId) => {
	let rider = await Rider.findOne({ available: true, seller: sellerId });
	if (!rider) {
		return {
			sellerRiderAvailable: false
		};
	} else {
		return {
			sellerRiderAvailable: true
		};
	}
};

export const gstAndTaxCalculationAfterCouponApply = async (
	data: IOrder & Record<string, any>,
	user
) => {
	try {
		data.buyer = user?._id;
		if (
			!data ||
			!data.seller ||
			!['online-cod', 'cod', 'online'].includes(data.paymentMode) ||
			!data.items ||
			!data.items.length
		) {
			return throwError(400);
		}

		if (data.isGroupOrder === true) {
			data.groupOrderTotal = await prepareGroupOrder(data);
		} else {
			data.isGroupOrder = false;
			data.groupOrderTotal = 0;
		}
		let coupon = await Coupon.findOne({ _id: data.coupon });
		let seller = await Seller.findOne({ _id: data.seller })
			.select('shopLocation deliveryMode shopName')
			.lean();
		let discount = 0;
		let sellerSCoupon = false;
		if (!coupon) {
			return createOrder(data, user);
		}
		if (coupon.type == 'delivery') {
			return data;
		} else if (coupon.type == 'flat') {
			discount = coupon.maxDiscount;
		} else if (coupon.type == 'discount') {
			discount = Math.floor(Math.random() * coupon.maxDiscount) || 5;
		}
		let preOrderTotal = data.order.totalAmt;
		await prepareItems(data);

		if (coupon.providedBy == 'seller') {
			let baseDiscount = data.order.discountAmt;
			data.couponDeduction = discount;
			data.couponProvidedBy = 'seller';
			await prepareMainAmtWithCoupon(data);

			await prepareDiscountWithCoupon(
				data,
				discount,
				sellerSCoupon,
				preOrderTotal - data.commission.restaurantGst
			);
			data.order.tokenAmt = 0;
			data.order.codAmt = 0;
			data.order.discountAmt = baseDiscount;

			data.order.totalAmt = Math.ceil(data.order.totalAmt);
		} else {
			await prepareMainAmt(data);

			await prepareDiscount(data);
			data.couponDeduction = discount;
			data.couponProvidedBy = 'platform';

			data.order.tokenAmt = 0;
			data.order.codAmt = 0;
			data.order.totalAmt = data.order.totalAmt - discount;
		}
		let detailsBreakup = {
			withDiscountAmt: preOrderTotal,
			discountAll: discount,
			gstAll: data.order.gstAmt,
			restaurantGst: data.commission.restaurantGst
		};
		const returnPeriods = data.items
			.filter((i) => i.returnPeriod >= 0)
			.map((i) => i.returnPeriod);

		const order: Partial<IOrder> = {
			seller: data.seller,
			buyer: data.buyer,
			isGroupOrder: data.isGroupOrder,
			groupOrder: null,
			runningDuration: data.runningDuration,
			paymentMode: data.paymentMode,
			order: data.order,
			couponDeduction: data?.couponDeduction,
			couponProvidedBy: data?.couponProvidedBy,
			delivery: {
				amount: null,
				period: 15
			},
			returnPeriod: returnPeriods.length
				? returnPeriods.reduce((min, i) => (min > i ? i : min), returnPeriods[0])
				: 0,
			items: data.items.map((item) => ({
				...item,
				product: {
					_id: (item.product as IProduct)._id,
					thumbImages: (item.product as IProduct).thumbImages?.length
						? [(item.product as IProduct).thumbImages[0]]
						: []
				} as IProduct
			}))
		};
		// let customer = await Customer.findOne({ _id: data.buyer })
		// 	.select('addresses balance rewardBalance name email contact')
		// 	.lean();

		// let sellerCoor = seller.shopLocation.coordinates;
		// let deliveredAddresses = [];
		// customer.addresses.forEach((add: any) => {
		// 	let buyerCoor = add.location.coordinates;
		// 	let distance = calculateDistanceTwo(
		// 		buyerCoor[1],
		// 		buyerCoor[0],
		// 		sellerCoor[1],
		// 		sellerCoor[0]
		// 	);
		// 	let newAdd = {
		// 		...add,
		// 		disable: distance > 1
		// 	};
		// 	deliveredAddresses.push(newAdd);
		// });

		// let buyerAddresses = deliveredAddresses;

		//   we are assuming that  primary address is  shipping address

		// delete customer.addresses;
		let codBlock = false;
		if (data.commission.restaurantGst > 50 || order.order.totalAmt > 1500) {
			codBlock = true;
		}
		return {
			...order,
			...detailsBreakup,
			codBlock,
			shopName: seller?.shopName
		};
	} catch (error) {
		throw error;
	}
};

export const prepareDiscountWithCoupon = async (
	data: IOrder & Record<string, any>,
	totalCouponDisc: Number,
	sellerSCoupon: boolean,
	preOrderTotal
) => {
	const seller = await Seller.findById(data.seller);

	let totalOrderAmt = data.order.totalAmt;

	let discountPercentage = tf2(+totalCouponDisc / totalOrderAmt);

	let discount;
	data.order = {
		mainAmt: 0,
		mainGst: 0,
		discount: discount,
		discountAmt: 0,
		netAmt: 0,
		gstAmt: 0,
		totalAmt: 0
	};
	data.commission = { restaurantGst: 0, insurance: 0 };

	for (let item of data.items) {
		let insured = item.insured;

		item.discount = getItemDiscountAfterCoupon(preOrderTotal, item, totalCouponDisc);
		item.amounts.discount = item.amounts.main * item.discount;

		item.amounts.main = item.amounts.main - item.amounts.discount;
		item.amounts.net = (item.amounts.main / (item.gst + 100)) * 100;
		const itemMainGst = tf2(item.amounts.net * 0.01 * item.gst);

		item.amounts.gst = tf2(item.amounts.net * 0.01 * item.gst);

		item.amounts.total = item.amounts.net + itemMainGst;
		data.order.mainAmt = tf2(data.order.mainAmt + item.amounts.main);
		data.order.mainGst = tf2(data.order.mainGst + itemMainGst);
		data.order.discountAmt = tf2(data.order.discountAmt + item.amounts.discount);
		data.order.netAmt = tf2(data.order.netAmt + item.amounts.net);
		let restaurantGst = item.service == 'Restaurant' ? tf2(item.amounts.net * 0.05) : 0;
		data.commission.insurance += insured ? tf2(item.amounts.net * 0.01 * item.insurance) : 0;
		data.order.gstAmt = tf2(data.order.gstAmt + item.amounts.gst + restaurantGst);
		data.commission.restaurantGst = tf2(restaurantGst + data.commission.restaurantGst);
		data.order.totalAmt = tf2(data.order.totalAmt + item.amounts.total + restaurantGst);
	}

	data.order.discount = tf2(100 * (data.order.discountAmt / data.order.mainAmt));
};

export const getItemDiscountAfterCoupon = (totalOrderAmt, item, totalDiscAmt) => {
	let discountAmount = totalDiscAmt * (item.amounts.main / totalOrderAmt);
	let discountPercentage = (item.amounts.main - discountAmount) / item.amounts.main;
	let percentage = 1 - discountPercentage;
	return percentage;
};

export const checkNextOrderRiderAvailable = async () => {
	let activeRiderVersion = await Version.findOne({
		appName: 'rider-mobile',
		latest: true
	})
		.select('metadata')
		.lean();
	const maxOrder = activeRiderVersion?.metadata?.maxOrderPerRider || 1;
	let findRider = await Rider.aggregate([
		{
			$match: {
				available: true,

				$expr: {
					$lt: [{ $size: '$activeOrders' }, maxOrder]
				}
			}
		}
	]);
	return findRider.length > 0;
};
export const availableDeliveryOptions = async (data) => {
	// letitude and longitude is of buyer
	let { sellers, sellerId, latitude, longitude, amtWithOutDelivery, couponType } = data;
	console.log(data, 'delivery options');
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
					coordinates: [+longitude, +latitude]
				}
			}
		}
	}).select('deliveryFee');
	if (!goodArea) {
		return {
			deliveryOptions: [],
			deliveryAvailable: false,
			gettingFreeDelivery: false,
			distance: 0,
			freeDeliveryAmount: 0
		};
	}

	let deliveryData = goodArea.deliveryFee;

	let deliveryOptions = [];
	let shopDelivery = false;
	let perKmTime = config.perKmTime;

	let shop = {
		display: 'Shop Delivery (Seller)',
		details: 'Delivery in 3 hr | ₹50',
		value: 1,
		available: false,
		charges: 50
	};
	//  yyyyyyyyyyyyyyyyyyyyyyyyy
	//  we are assuming that seller delivery radius is 2 km
	// if buyer  under  delivery radius  shopdelivery is true

	let selfDelivery = false;
	let time = 0;
	let timeString = '';
	let distance = 0;
	let packingTime = +10;
	let platformFreeDeliveryAmt = 100000;
	let freeDeliveryAmount = 2000;
	if (sellers.length == 1) {
		let seller = await Seller.findById(data.sellers[0]).select(
			'shopLocation deliveryMode packingTime'
		);
		let [sellerlongitude, selllerLatitude] = seller.shopLocation.coordinates;
		let freeDeliveryAmount = seller?.deliveryMode?.selfdelivery?.freeDeliveryAmount || 50000000; // freedelivery amount  if shop delivery
		let packingTime = +seller?.packingTime || 10;
		platformFreeDeliveryAmt = seller?.deliveryMode?.platform?.freeDeliveryAmount || 50000000;
		let deliveryCharges =
			amtWithOutDelivery >= freeDeliveryAmount
				? 0
				: seller?.deliveryMode?.selfdelivery?.deliveryCharges || 50;
		let deliveryTime = seller?.deliveryMode?.selfdelivery?.deliveryTime;
		shop.details = `Delivery in ${deliveryTime || 30 + packingTime} min | ₹${deliveryCharges}`;
		shop.charges = +deliveryCharges;
		let radius = +seller.deliveryMode?.selfdelivery?.deliveryRadius || 2;
		distance = (
			await getDistanceWithGoogle([selllerLatitude, sellerlongitude], [latitude, longitude])
		).distance;

		//  platform delivery charges

		time = packingTime + tf0(distance * perKmTime);
		timeString = convert_time(time);
		shopDelivery = distance <= radius;
		if (shopDelivery) {
			let sellerRiderAvailablity = await Rider.findOne({
				sellerApproved: true,
				available: true,
				seller: seller._id
			});
			if (sellerRiderAvailablity) {
				selfDelivery = true;
			}
		}

		deliveryOptions.push({
			...shop,
			freeDeliveryAmount: freeDeliveryAmount == 50000000 ? 0 : freeDeliveryAmount,
			available: selfDelivery,
			distance,
			deliveryFree: freeDeliveryAmount <= amtWithOutDelivery
		});
	}
	if (sellers.length > 1) {
		let Sellers: any = await Seller.find({ _id: { $in: sellers } })
			.select('shopLocation deliveryMode packingTime')
			.lean();
		Sellers = Sellers.map((x) => ({
			...x,
			latitude: x.shopLocation.coordinates[1],
			longitude: x.shopLocation.coordinates[0]
		}));
		console.log(Sellers);
		let bestPath = findBestRoute({ latitude, longitude }, Sellers);
		distance = bestPath.totalDistance;
		console.log(distance, sellers);
	}
	//

	let deliveryCharge = calculateDeliveryCharges(
		distance,
		deliveryData,
		couponType,
		platformFreeDeliveryAmt,
		amtWithOutDelivery
	);
	console.log('sai');
	let platDelivery = {
		display: 'Platform Delivery ',
		details: `Delivery in 30 minutes | ₹${deliveryCharge.totalCharges}`,
		value: 0,
		available: false,
		longDistance: deliveryCharge.longDistanceCharges,
		charges: deliveryCharge.totalCharges,
		freeDeliveryAmount: platformFreeDeliveryAmt == 50000000 ? 0 : platformFreeDeliveryAmt,
		deliveryFree: false,
		base: deliveryCharge.base,
		surge: deliveryCharge.surgeCharges,
		distance: distance
	};

	let platformDelivery = {
		available: false,
		delay: false
	};
	let platformRiders = await Rider.findOne({
		available: true,
		seller: { $exists: false },

		activeOrders: { $size: 0 }
	});

	if (platformRiders) {
		platformDelivery = {
			available: true,
			delay: false
		};
	}
	if (!platformRiders) {
		let rider = await Rider.aggregate([
			{
				$match: {
					available: true,
					seller: { $exists: false },
					$expr: {
						$lt: [{ $size: '$activeOrders' }, maxOrderPerRider]
					}
				}
			}
		]);
		if (!rider.length) {
			platformDelivery = {
				available: false,
				delay: false
			};
		} else if (rider?.length) {
			let nearByRider;
			let minDistance = 100;
			let otherOrderDeliveryTime = 0;
			for (let r of rider) {
				let activeOrdersDistance = await calculateDistance(r._id);
				if (activeOrdersDistance < minDistance) {
					nearByRider = r;
					minDistance = activeOrdersDistance;
					otherOrderDeliveryTime = tf0(minDistance * perKmTime);
				}
			}

			time += otherOrderDeliveryTime;
			timeString = convert_time(time);
			platformDelivery = {
				available: true,
				delay: true
			};
		}
	}

	//  Show buyer to  add x amount  to order, get free delivery

	let addAmountCart = {
		amount: 1500,
		by: 'platform',
		calculated: false
	};

	if (shopDelivery) {
		let amountPercent = ((freeDeliveryAmount - amtWithOutDelivery) / freeDeliveryAmount) * 100;

		if (amountPercent <= 25) {
			addAmountCart.amount = Math.ceil(freeDeliveryAmount - amtWithOutDelivery);
			addAmountCart.by = 'shop';
			addAmountCart.calculated = true;
		}
	}
	if (platformDelivery.available) {
		let amountPercent =
			((platformFreeDeliveryAmt - amtWithOutDelivery) / platformFreeDeliveryAmt) * 100;

		let amount = platformFreeDeliveryAmt - amtWithOutDelivery;
		if (amount <= addAmountCart.amount) {
			if (amountPercent <= 25) {
				addAmountCart.amount = Math.ceil(platformFreeDeliveryAmt - amtWithOutDelivery);
				addAmountCart.by = 'platform';
				addAmountCart.calculated = true;
			}
		}
	}

	platDelivery.details = platformDelivery.delay
		? `Delivery in ${timeString} | ₹${deliveryCharge.totalCharges} ${
				deliveryData.surge ? 'Rain Surge Applied' : ''
		  }`
		: `Delivery in ${timeString} | ₹${deliveryCharge.totalCharges} ${
				deliveryData.surge ? 'Rain Surge Applied' : ''
		  }`;

	platDelivery.available = platformDelivery.available;

	platDelivery.deliveryFree = deliveryCharge.deliveryFree;
	deliveryOptions.push(platDelivery);
	let addCartString = `₹${addAmountCart.amount} more for free ${addAmountCart.by} delivery !`;
	let deliveryAvailable = platformDelivery.available || selfDelivery ? true : false;

	let result = {
		deliveryOptions,
		deliveryAvailable,
		distance,
		addCartString: addAmountCart.amount > 0 && addAmountCart?.calculated ? addCartString : null
	};

	return result;
};

//  if rider not available at the moment order accpetance
export const rejectOrderDueToRider = async (order: IOrder) => {
	let status = 'rejected';
	let newStatus = {
		status: status as OrderStatus,
		date: new Date(),
		by: null,
		remarks: 'rider not available'
	};
	order.currentStatus = newStatus;
	order.rejected.status = true;
	order.rejected.date = new Date();

	if (order?.rider) {
		let removeOrderFormActiveOrders = await Rider.updateOne(
			{ _id: order.rider },
			{ $pull: { activeOrder: order._id } }
		);

		global.io.emit('isDeliveryAvailable', {
			available: true,
			text: getStripText()
		});
	}
	order.statusHistory.push(newStatus);
	let orderItems = order.items.map((item) => item.name);

	const buyerNotification = createBuyerNotification(
		'BUYER_ORDER_REJECTED',
		order.buyer.toString(),
		{
			order,
			productNames: orderItems,
			seller: order.sellerDetails.name
		}
	);
	sendBuyerNotification(buyerNotification);

	let sellerNotification = createSellerNotification(
		'SELLER_ORDER_CANCELLED_RIDER',
		order.seller.toString(),
		order
	);
	sendSellerNotification(sellerNotification);
	if (order?.rewardUse || order?.walletUse) {
		if (order?.walletUse) {
			await History.create({
				type: 'wallet',
				buyer: order.buyer,
				amount: order?.walletUse,
				date: new Date(),
				action: 'credit',
				remark: `Order Reject*: ${order._id}`
			});
		}
		if (order.rewardUse) {
			await History.create({
				type: 'reward',
				buyer: order.buyer,
				amount: order.rewardUse,
				date: new Date(),
				action: 'credit',
				remark: `Order Reject*: ${order._id}`
			});
		}
		let buyer = await Customer.findOneAndUpdate(
			{ _id: order.buyer },
			{ $inc: { balance: order.walletUse, rewardBalance: order.rewardUse } }
		);
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
				amount: amount,
				buyer: order.buyer,
				date: new Date(),
				action: 'credit',
				remark: `Order Reject*: ${order._id}`
			});
		}
	}
};

export const calculateDeliveryCharges = (
	distance,
	deliveryData,
	couponType,
	platformFreeDeliveryAmt,
	amtWithOutDelivery
) => {
	let surge = deliveryData.surge;
	let surgeCharges = 0;
	let baseCharge =
		couponType == 'delivery' || platformFreeDeliveryAmt <= amtWithOutDelivery
			? 0
			: deliveryData.base.charges;
	surgeCharges += surge ? deliveryData.base.surge : 0;
	if (distance <= deliveryData.base.end) {
		return {
			longDistanceCharges: 0,
			totalCharges: baseCharge + surgeCharges,
			base: deliveryData.base.charges + surgeCharges,
			surgeCharges
		};
	}

	let charges = baseCharge;

	if (distance <= deliveryData.mid.end) {
		let midKm = tf2(distance - deliveryData.base.end);
		surgeCharges += surge ? midKm * deliveryData.mid.surge : 0;
		charges += tf2(midKm * deliveryData.mid.charges);
	} else if (distance > deliveryData.mid.end) {
		let disKm = tf2(deliveryData.mid.end - deliveryData.base.end);
		surgeCharges += surge ? disKm * deliveryData.mid.surge : 0;
		charges += tf2(disKm * deliveryData.mid.charges);
	}
	if (distance <= deliveryData.long.end && distance > deliveryData.mid.end) {
		let disKm = tf2(distance - deliveryData.mid.end);
		surgeCharges += surge ? disKm * deliveryData.long.surge : 0;
		charges += tf2(disKm * deliveryData.long.charges);
	} else if (distance > deliveryData.long.end) {
		let disKm = tf2(deliveryData.long.end - deliveryData.mid.end);
		surgeCharges += surge ? disKm * deliveryData.long.surge : 0;
		charges += tf2(disKm * deliveryData.long.charges);
	}
	if (distance > deliveryData.extraLong.start) {
		let disKm = tf2(distance - deliveryData.extraLong.start);
		surgeCharges += surge ? disKm * deliveryData.extraLong.surge : 0;
		charges += tf2(disKm * deliveryData.extraLong.charges);
	}
	return {
		longDistanceCharges: Math.ceil(charges - baseCharge),
		totalCharges: Math.ceil(charges + surgeCharges),
		baseCharge,
		base: deliveryData.base.charges,
		surgeCharges,
		deliveryFree: amtWithOutDelivery >= platformFreeDeliveryAmt || couponType == 'delivery'
	};
};
export const prepareMainAmtWithCoupon = async (data: IOrder) => {
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
		item.unitPrice = minPrice.sellingPrice; // Item price without GST
		item.amounts.main = tf2(item.quantity * item.unitPrice);

		// Items price without GST
		let netAmt = tf2((minPrice.sellingPrice * 100) / (100 + minPrice.gst));

		item.amounts.net = tf2(netAmt * item.quantity); //
		item.gstType = minPrice.gstType; // [Inclusive, Exclusive, No GST]
		item.gst = minPrice.gst; // GST percentage
		item.amounts.margin = 0;

		item.amounts.gst = tf2(item.quantity * (item.unitPrice * item.quantity - item.amounts.net)); // GST Value
		item.amounts.total = tf0(item.amounts.net + item.amounts.gst); // Total amount of item
		let restaurantGst = item.service == 'Restaurant' ? tf2(item.amounts.net * 0.05) : 0;

		data.commission.restaurantGst = tf2(restaurantGst + data.commission.restaurantGst);
		data.order.mainAmt = tf2(data.order.mainAmt + item.amounts.main);
		data.order.mainGst = tf2(data.order.mainGst + item.amounts.gst + restaurantGst);
		data.order.netAmt = tf2(data.order.netAmt + item.amounts.net);
		data.order.gstAmt = tf2(data.order.gstAmt + item.amounts.gst);
		data.order.totalAmt = tf2(data.order.totalAmt + item.amounts.total + restaurantGst);
	}
};

// The type annotation :number means that the parameter and the return value are numbers
export const convert_time = (time: number): string => {
	// time is an integer representing the number of minutes
	// returns a string in the format of "X H Y Minutes"
	if (time < 30) {
		time = 30;
	}
	let hours = Math.floor(time / 60); // integer division to get the number of hours
	let minutes = time % 60;
	if (hours > 0) {
		return `${hours} Hr ${minutes} Min`;
	} else {
		return `${minutes} Min`;
	}

	// template string output
	// modulo operation to get the remaining minutes
};
export const reverseConvertTime = (timeString: string): number => {
	const timeParts = timeString.split(' ');

	if (timeParts.length === 4) {
		// Case: "X Hr Y Min"
		const hours = parseInt(timeParts[0]);
		const minutes = parseInt(timeParts[2]);
		return hours * 60 + minutes;
	} else if (timeParts.length === 2) {
		// Case: "X Min"
		return parseInt(timeParts[0]);
	} else {
		throw new Error('Invalid time string format');
	}
};

export const extractTimeFromString = (inputString) => {
	const match = inputString.match(/\d+\s*(Hr)?\s*\d+\s*Min/);
	if (match) {
		return match[0];
	} else {
		return null;
	}
};
