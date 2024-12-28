import { add, startOfDay, endOfDay, addDays } from 'date-fns';
import { LeanDocument, model } from 'mongoose';
import { calculateDiscount } from '../../helpers/discount';
import { createAdminNotification } from '../../helpers/notifications/admin';
import { createBuyerNotification } from '../../helpers/notifications/buyer';
import {
	sendAdminNotification,
	sendBuyerNotification,
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
import newProductModel from '../../models/seller/product';
import { completeRunningOrder } from '../../schedulars/order-maturity-schedular';
import { getCustomerCoupon, applyCoupon } from '../customers/coupons';
import { generateInvoice } from './invoices';
import { ISeller } from '../../models/customer/seller';
import * as dateFns from 'date-fns';

const Order = model<IOrder>('Order');
const GroupOrder = model<IGroupOrder>('GroupOrder');
const Customer = model<ICustomer>('Customer');
const Seller = model<ISeller>('NewCustomer');

export const getSellerStats = async (queryObj, data) => {
	const { sellerId } = data;
	const startDate = queryObj.startDate
		? new Date(queryObj.startDate)
		: dateFns.startOfDay(new Date());
	const endDate = queryObj.endDate ? new Date(queryObj.endDate) : dateFns.endOfDay(new Date());
	let preStartDate, preEndDate;
	let returnPiaChartData = [];
	let returnPiaChartObj = {};
	let cancelPiaChartData = [];
	let cancelPiaChartObj = {};
	let cancelCount = 0;
	if (queryObj.type == 'Today') {
		preStartDate = dateFns.subDays(startDate, 1);
		preEndDate = dateFns.subDays(endDate, 1);
	} else if (queryObj.type == 'Week') {
		preStartDate = dateFns.subDays(startDate, 7);
		preEndDate = dateFns.subDays(endDate, 7);
	} else if (queryObj.type == 'Month') {
		preStartDate = dateFns.subDays(startDate, 30);
		preEndDate = dateFns.subDays(endDate, 30);
	} else {
		let days = dateFns.differenceInCalendarDays(startDate, endDate);
		preStartDate = dateFns.subDays(startDate, days);
		preEndDate = dateFns.subDays(endDate, days);
	}
	let seller: any = await Seller.findOne({ _id: sellerId });
	if (!seller) {
		throwError(404);
	}
	let query = {};
	let uniqueBuyers = 0;

	let uniqueBuyersArray = [];
	let amount = 0;
	let returnedCount = 0;

	// all value in percents
	let buyerIncrement = 0;
	let orderIncrement = 0;
	let totalSalesInc = 0;
	let returnInc = 0;
	let avrageValueINc = 0;
	query = { createdAt: { $lte: startDate, $gte: endDate } };
	let preOrders = await Order.find({ createdAt: { $lte: preStartDate, $gte: preEndDate } });

	let orders = await Order.find({
		// seller: seller._id
		...query
	}).lean();

	orders.forEach((order: any) => {
		amount = amount + order.order.mainAmt;
		if (order?.returned.status) {
			returnedCount++;
		}
		if (!uniqueBuyersArray.includes(order.buyer.toString())) {
			uniqueBuyersArray.push(order.buyer.toString());

			if (returnPiaChartObj[order?.returned?.reason]) {
				returnPiaChartObj[order?.returned?.reason] =
					returnPiaChartObj[order?.returned?.reason] + 1;
			} else {
				returnPiaChartObj[order?.returned?.reason] = 1;
			}
		}
		if (order?.cancelled) {
			cancelCount++;
			if (cancelPiaChartObj[order?.cancelled?.reason]) {
				cancelPiaChartObj[order?.cancelled?.reason] =
					returnPiaChartObj[order?.cancelled?.reason] + 1;
			} else {
				cancelPiaChartObj[order?.cancelled?.reason] = 1;
			}
		}
		if (!uniqueBuyersArray.includes(order.buyer.toString())) {
			uniqueBuyersArray.push(order.buyer.toString());
		}
	});

	let averageAmount = amount / orders.length || 0;
	uniqueBuyers = uniqueBuyersArray.length;
	let preUniqueBuyers = 0;
	let preUniqueBuyersArray = [];
	let preAmount = 0;
	let preReturnedCount = 0;
	preOrders.forEach((order: any) => {
		preAmount = preAmount + order.order.mainAmt;
		if (order?.returned.status) {
			preReturnedCount++;
		}
		if (!preUniqueBuyersArray.includes(order.buyer.toString())) {
			preUniqueBuyersArray.push(order.buyer.toString());
		}
	});

	let totalLifeTimeSales = await Order.aggregate([
		{ $match: { seller: seller._id } },
		{
			$group: {
				_id: '',
				sales: { $sum: '$order.mainAmt' }
			}
		}
	]);

	let preAverageAmount = preAmount / preOrders.length || 0;
	preUniqueBuyers = preUniqueBuyersArray.length;

	totalSalesInc = preAmount == 0 ? 100 : ((amount - preAmount) / preAmount) * 100;
	orderIncrement = preOrders.length
		? ((orders.length - preOrders.length) / preOrders.length) * 100
		: 100;
	avrageValueINc =
		preAverageAmount == 0 ? 100 : ((averageAmount - preAverageAmount) / preAverageAmount) * 100;
	buyerIncrement = preUniqueBuyersArray.length
		? ((uniqueBuyersArray.length - preUniqueBuyersArray.length) / preUniqueBuyersArray.length) *
		  100
		: 100;
	returnInc =
		preReturnedCount !== 0
			? ((returnedCount - preReturnedCount) / preReturnedCount) * 100
			: preReturnedCount == 0 && returnedCount == 0
			? 0
			: 0;

	for (let reason in returnPiaChartObj) {
		let element = {
			name: reason,
			value: returnPiaChartObj[reason],
			color: '',
			percentage: 0
		};
		returnPiaChartData.push(element);
	}
	let colors = ['#b63f2a', '#7d9e67', '#f7c8c5', '#4568b1', '#ab5236', '#e9c756', '#1d5b8f'];
	returnPiaChartData.forEach((e, i) => {
		e.color = colors[i];
		e.percentage = ((e.value * 100) / returnedCount).toFixed(2);
	});
	returnPiaChartData.sort((a, b) => b.count - a.count);

	for (let reason in cancelPiaChartObj) {
		let element = {
			name: reason,
			value: cancelPiaChartObj[reason]
		};
		cancelPiaChartData.push(element);
	}
	cancelPiaChartData.sort((a, b) => b.count - a.count);

	return {
		averageAmount: averageAmount.toFixed(2),
		returnedCount: returnedCount,
		amount: amount.toFixed(1),
		totalOrders: orders.length,
		uniqueBuyers: uniqueBuyers,
		buyerIncrement: uniqueBuyers ? 0 : buyerIncrement.toFixed(1),
		orderIncrement: orders.length ? orderIncrement.toFixed(1) : 0,
		totalSalesInc: amount ? totalSalesInc.toFixed(1) : 0,
		returnInc: preReturnedCount == 0 && returnedCount > 0 ? 100 : returnInc,
		avrageValueINc: averageAmount ? avrageValueINc.toFixed(1) : 0,
		cancelledPiaChartData: cancelPiaChartData,
		returnedPiaChartData: returnPiaChartData,
		totalEarnings: (amount * 0.75).toFixed(2),
		totalLifeTimeSales: totalLifeTimeSales[0].sales.toFixed(2),
		totalLifeTimeOrders: totalLifeTimeSales[0].totalLifeTimeOrder,
		totalLifeTimeEarnings: (totalLifeTimeSales[0].sales * 0.75).toFixed(2),
		totalLifeTimeIncrementInOrder:
			orders.length == 0
				? 0
				: ((totalLifeTimeSales[0].totalLifeTimeOrder - orders.length) /
						totalLifeTimeSales[0].totalLifeTimeOrder) *
				  100
	};
};

export const getChartData = async (queryObj) => {
	//  let { startDate, endDate, type } = queryObj;
	let query = {};
	let type = '';
	const startDate = queryObj.startDate
		? new Date(queryObj.startDate)
		: dateFns.startOfDay(new Date());
	const endDate = queryObj.endDate ? new Date(queryObj.endDate) : dateFns.endOfDay(new Date());

	const weekdays: string[] = [
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
		'Sunday'
	];
	const shortMonths = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];

	const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
	const hours = [
		'12 AM',
		'1 AM',
		'2 AM',
		'3 AM',
		'4 AM',
		'5 AM',
		'6 AM',
		'7 AM',
		'8 AM',
		'9 AM',
		'10 AM',
		'11 AM',
		'12 PM',
		'1 PM',
		'2 PM',
		'3 PM',
		'4 PM',
		'5 PM',
		'6 PM',
		'7 PM',
		'8 PM',
		'9 PM',
		'10 PM',
		'11 PM'
	];

	// for showing  in  xaxies name chart
	const convertIntoString = (index, type) => {
		if (type == 'Hour') {
			return hours[index - 1];
		} else if (type == 'Quarter') {
			return quarters[index - 1];
		} else if (type == 'Month') return shortMonths[index - 1];
		else if (type == 'Day') {
			return weekdays[index - 1];
		} else {
			return index;
		}
	};
	let days = dateFns.differenceInCalendarDays(startDate, endDate);
	let xAxiesType = '';
	let startIndex = 1;
	let lastIndex = 0;
	if (days >= 7 && days < 30) {
		type = 'Week';
		xAxiesType = 'Day';
	} else if (days >= 30 && days < 90) {
		type = 'Month';
		// xAxiesType = 'day';
	} else if (days >= 90 && days < 365) {
		type = 'Quarter';
	} else if (days >= 365) {
		xAxiesType = 'Month';
		type = 'Yearly';
	} else {
		xAxiesType = 'Hour';
		type = 'Day';
	}
	queryObj.xAxiesType !== '' ? (xAxiesType = queryObj.xAxiesType) : '';

	if (xAxiesType == 'Quarter') {
		startIndex = dateFns.getQuarter(startDate);
		lastIndex = dateFns.getQuarter(endDate);
		query = {
			$group: {
				_id: '$quarter',
				count: { $sum: 1 },
				TotalOrders: { $sum: 1 },
				TotalSales: {
					$sum: '$order.mainAmt'
				},
				'Average Order Value': { $sum: 1 },
				'Net Earning': { $sum: 1 }
			}
		};
	} else if (xAxiesType == 'Hour') {
		startIndex = 1;
		lastIndex = 24;
		query = {
			$group: {
				_id: { $hour: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
				count: { $sum: 1 },
				TotalOrders: { $sum: 1 },
				TotalSales: {
					$sum: '$order.mainAmt'
				},
				'Average Order Value': { $sum: 1 },
				'Net Earning': { $sum: 1 }
			}
		};
	} else if (xAxiesType == 'Day') {
		(startIndex = 1), (lastIndex = 7);
		query = {
			$group: {
				_id: { $dayOfWeek: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
				count: { $sum: 1 },
				TotalOrders: { $sum: 1 },
				TotalSales: {
					$sum: '$order.mainAmt'
				},
				'Average Order Value': { $sum: 1 },
				'Net Earning': { $sum: 1 }
			}
		};
	} else if (xAxiesType == 'Month') {
		startIndex = dateFns.getMonth(startDate);
		lastIndex = dateFns.getMonth(endDate);
		query = {
			$group: {
				_id: { $month: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
				count: { $sum: 1 },
				TotalOrders: { $sum: 1 },
				TotalSales: {
					$sum: '$order.mainAmt'
				},
				'Average Order Value': { $sum: 1 },
				'Net Earning': { $sum: 1 }
			}
		};
	} else if (xAxiesType == 'Week') {
		startIndex = dateFns.getWeekYear(startDate);
		lastIndex = dateFns.getWeekYear(endDate);
		query = {
			$group: {
				_id: { $week: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
				count: { $sum: 1 },
				TotalOrders: { $sum: 1 },
				TotalSales: {
					$sum: '$order.mainAmt'
				},
				'Average Order Value': { $sum: 1 },
				'Net Earning': { $sum: 1 }
			}
		};
	}
	let ordersMax = 0,
		ordersMin = 0,
		salesMax = 0,
		salesMin = 0,
		earMin = 0,
		earMax = 0,
		avMin = 0,
		avMax = 0;
	let finalQuery = [];
	if (xAxiesType == 'Quarter') {
		finalQuery = [
			{
				$match: { createdAt: { $lte: startDate, $gte: endDate } }
			},
			{
				$addFields: {
					quarter: {
						$ceil: {
							$divide: [{ $month: '$createdAt' }, 3]
						}
					}
				}
			},
			query
		];
	} else {
		finalQuery = [
			{
				$match: { createdAt: { $lte: startDate, $gte: endDate } }
			},
			query
		];
	}
	let orderdata = await Order.aggregate(finalQuery);
	orderdata.sort((a, b) => a._id - b._id);
	orderdata.forEach((element) => {
		if (element.TotalOrders > ordersMax) {
			ordersMax = element.TotalOrders;
		}
		if (element.TotalSales > salesMax) {
			salesMax = element.TotalSales;
		}

		element['Net Earning'] = (element.TotalSales * 0.95).toFixed(2);
		element['Average Order Value'] = (
			element.TotalSales / element['Average Order Value']
		).toFixed(1);
	});

	for (let i = 0; i <= lastIndex - startIndex; i++) {
		let element = orderdata[i];
		// ;
		if (!element || (i + startIndex != element?._id && i + startIndex < element?._id)) {
			orderdata.splice(i, 0, {
				_id: i + startIndex,
				TotalOrders: 0,
				TotalSales: 0,
				'Net Earning': 0,
				'Average Order Value': 0
			});
		}
	}
	orderdata.forEach((element) => {
		element._id = `${convertIntoString(element._id, xAxiesType)}`;
		if (+element['Net Earning'] > earMax) {
			earMax = +element['Net Earning'];
		}
		if (+element['Average Order Value'] > avMax) {
			avMax = +element['Average Order Value'];
		}
	});

	return {
		orderData: orderdata,
		limits: {
			TotalOrders: [0, Math.trunc(ordersMax + ordersMax * 0.1), ordersMax],
			TotalSales: [0, Math.trunc(salesMax + salesMax * 0.1), salesMax],
			'Net Earning': [0, Math.trunc(earMax + earMax * 0.1), earMax],
			'Average Order Value': [0, Math.trunc(avMax + avMax * 0.1), avMax]
		},
		xAxiesType: xAxiesType,
		options:
			type == 'Yearly'
				? ['Hour', 'Day', 'Week', 'Quarter', 'Month']
				: type == 'Quarter'
				? ['Hour', 'Day', 'Week', 'Month']
				: type == 'Month'
				? ['Hour', 'Day', 'Week']
				: type == 'Week'
				? ['Hour', 'Day']
				: ['Hour']
	};
};
