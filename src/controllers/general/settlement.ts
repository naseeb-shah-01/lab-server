import { Types, model } from 'mongoose';
import { throwError } from '../../helpers/throw-errors';
import { ISettlement } from '../../models/general/settlement';
import { ISeller } from '../../models/customer/seller';
import { ICustomer } from '../../models/customer/customer';
import { IRider } from '../../models/rider/rider';
import { IOrder } from '../../models/order/order';
import { CronJob } from 'cron';

import * as XLSX from 'xlsx';

import {
	endOfWeek,
	format,
	getDay,
	getWeek,
	getYear,
	lastDayOfWeek,
	parseISO,
	startOfWeek,
	eachDayOfInterval,
	isMonday,
	isThursday,
	isWithinInterval,
	endOfDay,
	startOfDay,
	differenceInDays,
	differenceInHours,
	getDayOfYear,
	startOfMonth,
	endOfMonth,
	subDays,
	isFriday,
	addDays,
	isSunday,
	setYear,
	setWeek
} from 'date-fns';
import moment from 'moment';
import { IAttendance } from '../../models/rider/workingHours';
import { tf2 } from '../../helpers/number';
import { gatewayChargesRate } from '../seller/invoices';
import { getResults } from '../../helpers/query';
import { trafficdirector_v2 } from 'googleapis';
import { sendEmail } from '../../helpers/mailer';
import { IProduct } from '../../models/seller/product';
import { sendPendingPaymentToDiscord } from '../discord/discord_webhook';

const Seller = model<ISeller>('NewCustomer');
const Rider = model<IRider>('Rider');
const Attendance = model<IAttendance>('Attendance');
const Order = model<IOrder>('Order');
const Settlement = model<ISettlement>('Settlement');
const Product = model<IProduct>('NewProduct');

export const findOrder = async (data, user) => {
	//body frontend mei jo dali and seller ki particular id
	try {
		let { startDate, endDate } = data;
		let orders = await Order.find({
			seller: user?._id,
			createdAt: { $gte: startDate, $lte: endDate }
		}).select(
			'paymentMode status order.totalAmt deliveryMode.display type createdAt buyerDetails.name'
		);

		return {
			startDate,
			endDate,
			orders
		};
	} catch (err) {
		console.error(err);
	}
};

export const sellerInvoices = async (data, user) => {
	try {
		let { timeBatch, year }: { timeBatch: any; year: any } = data;

		let today = new Date(); //current date

		if (!year) {
			year = getYear(today);
		}
		let slots = createTimeSlots(year);

		let slot;
		if (!timeBatch) {
			let current = getTodayTimeSlot(slots);
			timeBatch = current?.index + 1;
			slot = current?.timeSlot;
		} else {
			slot = slots[timeBatch - 1];
		}
		let { start, end } = slot;
		// timeBatch = slot.index + 1;/

		let orders = await Order.find({
			seller: user?._id,
			startDate: { $gte: start },
			endData: { $lte: end }
		});
		let orderCount = orders.length;

		let settlement = await Settlement.find({
			//seller: user?._id
			// startDate: {
			// 	$gte: start
			// },
			// endDate: { $lte: end }
		})
			.populate('seller', 'bankDetails businessName contact orders')
			.limit(10);
		let difference = differenceInHours(start, end);
		let timeBatchs = [];

		for (let i = 1; i <= timeBatch; i++) {
			timeBatchs.push({ ...slots[i - 1], batch: i });
		}
		return {
			settlement,
			year,
			timeBatch,
			start,
			end,
			timeBatchs,
			difference,
			orderCount
		};

		// get the end date of the week
		// const endDate = endOfWeek(startDate);
	} catch (err) {
		console.error(err);
	}
};

export const sellerSettlements = async (data) => {
	try {
		let { timeBatch, year } = data;
		let today = new Date();
		if (!year) {
			year = getYear(today);
		}
		let slots = createTimeSlots(year);
		let slot;
		if (!timeBatch) {
			let current = getTodayTimeSlot(slots);
			timeBatch = current?.index + 1;
			slot = current?.timeSlot;
		} else {
			slot = slots[timeBatch - 1];
		}
		let { start, end } = slot;

		// timeBatch = slot.index + 1;/
		let settlement = await Settlement.find({
			seller: {
				$exists: true
			},
			startDate: {
				$gte: start
			},
			endDate: { $lte: end }
		}).populate('seller', 'bankDetails businessName contact orders');
		let difference = differenceInHours(end, start);
		let timeBatchs = [];
		for (let i = 1; i <= timeBatch; i++) {
			timeBatchs.push({ ...slots[i - 1], batch: i });
		}

		return {
			settlement,
			year,
			timeBatch,
			start,
			end,
			timeBatchs,
			difference
		};
		// get the end date of the week
		// const endDate = endOfWeek(startDate);
	} catch (err) {
		console.error(err);
	}
};

export const sellerSettlementsExcel = async (res, data) => {
	try {
		let { timeBatch, year } = data;
		let today = new Date();

		if (!year) {
			year = getYear(today);
		}
		let slots = createTimeSlots(+year);

		let slot;
		if (!timeBatch) {
			let current = getTodayTimeSlot(slots);
			timeBatch = current?.index + 1;
			slot = current?.timeSlot;
		} else {
			slot = slots[+timeBatch - 1];
		}
		let { start, end } = slot;
		// timeBatch = slot.index + 1;/

		let settlement = await Settlement.find({
			seller: {
				$exists: true
			},
			//  testing
			startDate: {
				$gte: start
			},
			endDate: { $lte: end }
		}).populate('seller', 'bankDetails businessName contact OrderCount addresses');

		let difference = differenceInHours(start, end);
		let timeBatchs = [];

		for (let i = 1; i <= timeBatch; i++) {
			timeBatchs.push({ ...slots[i - 1], batch: i });
		}

		let settlementSheetHeaders = [
			[
				'Transaction Type',
				'Beneficiary  Code',
				'Beneficiary  A/c No.',
				'Transaction Amount',
				'Benefirciary Name',
				'Drawee Location',
				'Print Location',
				'Beneficiary add line1',
				'Beneficiary add line2',
				'Beneficiary add line3',
				'Beneficiary add line4',
				'Zipcode',
				'Instrument Ref No.',
				'Customer Ref No.',
				'Advising Detail1',

				'Advising Detail2',
				'Advising Detail3',
				'Advising Detail4',
				'Advising Detail5',
				'Advising Detail6',
				'Advising Detail7',
				'Cheque No.',
				'Instrument Date',
				'MICR No',
				'IFSC Code',
				'Bene Bank Name',
				'Bene Bank Branch',
				'Bene Email ID',
				'Debit A/C Number',
				'Source Narration',
				'Target Narration',
				'Value Date'
			]
		];
		settlement.forEach((set: any, index) => {
			let uniqueId = set?.seller?._id?.toString();
			let lastFour = uniqueId?.substring(uniqueId.length - 4);
			const firstFourChars = set?.seller?.businessName
				?.substring(0, 4)
				?.replace(/[^a-zA-Z0-9]/g, '');
			const date = new Date();
			let customerRef =
				date.getDate().toString() +
				(index > 9 ? index : '0' + index) +
				(set.OrderCount || date.getMinutes() + 4);
			let row = [
				'IMPS',
				firstFourChars + lastFour,
				set.seller?.bankDetails.accountNumber,
				set.amount,
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				customerRef,
				'',

				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				set?.seller?.bankDetails.ifsc,
				'',
				'',
				'',
				'259798981998',
				'',
				'',
				''
			];
			settlementSheetHeaders.push(row);
		});

		// res.setHeader(`Content-Disposition', 'attachment; filename=);
		// res.setHeader('Content-Type', 'application/octetstream');
		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.aoa_to_sheet(settlementSheetHeaders);
		XLSX.utils.book_append_sheet(workbook, worksheet, 'sett');

		// let wb = XLSX.utils.book_new();

		return workbook;

		// get the end date of the week
		// const endDate = endOfWeek(startDate);
	} catch (err) {
		console.error(err);
	}
};
export const riderSettlementsExcel = async (res, data) => {
	try {
		let { timeBatch, year } = data;
		let today = new Date();

		if (!timeBatch) {
			timeBatch = getWeek(today);
		}

		if (!year) {
			year = getYear(today);
		}
		const startDate = setYear(setWeek(new Date(), timeBatch), year);
		const startOfWeekDate = startOfWeek(startDate, { weekStartsOn: 1 });
		let end = endOfWeek(startOfWeekDate);
		let start = startOfWeek(startOfWeekDate, { weekStartsOn: 1 });
		timeBatch = getWeek(start);
		let settlement = await Settlement.find({
			startDate: start,
			endDate: end,
			seller: {
				$exists: false
			}
		}).populate('rider', 'bankDetails name');

		let settlementSheetHeaders = [
			[
				'Transaction Type',
				'Beneficiary  Code',
				'Beneficiary  A/c No.',
				'Transaction Amount',
				'Benefirciary Name',
				'Drawee Location',
				'Print Location',
				'Beneficiary add line1',
				'Beneficiary add line2',
				'Beneficiary add line3',
				'Beneficiary add line4',
				'Zipcode',
				'Instrument Ref No.',
				'Customer Ref No.',
				'Advising Detail1',

				'Advising Detail2',
				'Advising Detail3',
				'Advising Detail4',
				'Advising Detail5',
				'Advising Detail6',
				'Advising Detail7',
				'Cheque No.',
				'Instrument Date',
				'MICR No',
				'IFSC Code',
				'Bene Bank Name',
				'Bene Bank Branch',
				'Bene Email ID',
				'Debit A/C Number',
				'Source Narration',
				'Target Narration',
				'Value Date'
			]
		];
		settlement.forEach((set: any, index) => {
			let code = set?.rider?._id;
			let uniqueId = code.toString();
			let lastFour = uniqueId?.substring(uniqueId.length - 4);
			const firstFourChars = set?.rider?.name?.substring(0, 4)?.replace(/[^a-zA-Z0-9]/g, '');

			const date = new Date();
			let customerRef =
				date.getDate().toString() +
				(index > 9 ? index : '0' + index) +
				(set.OrderCount || date.getMinutes());
			let row = [
				'IMPS',
				firstFourChars + lastFour,

				set.rider?.bankDetails.accountNumber,
				set.amount,
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				customerRef,
				'',

				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'', // set?.rider?.bankDetails.ifsc,
				'',
				'',
				'',
				'259798981998',
				'',
				'',
				''
			];
			settlementSheetHeaders.push(row);
		});

		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.aoa_to_sheet(settlementSheetHeaders);
		XLSX.utils.book_append_sheet(workbook, worksheet, 'sett');

		// let wb = XLSX.utils.book_new();

		return workbook;
	} catch (err) {
		console.error(err);
	}
};

export const riderSettlements = async (data) => {
	try {
		let today = new Date();

		let { timeBatch, year } = data;

		if (!timeBatch) {
			timeBatch = getWeek(today);
		}

		if (!year) {
			year = getYear(today);
		}
		const startDate = setYear(setWeek(new Date(), timeBatch), year);
		const startOfWeekDate = startOfWeek(startDate, { weekStartsOn: 1 });
		let end = endOfWeek(startOfWeekDate);
		let start = startOfWeek(startOfWeekDate, { weekStartsOn: 1 });
		timeBatch = getWeek(start);
		let settlement = await Settlement.find({
			startDate: start,
			endDate: end,
			rider: {
				$exists: true
			}
		}).populate('rider', 'bankDetails name addresses');
		let timeBatchs = [];

		for (let i = 1; i <= timeBatch; i++) {
			timeBatchs.push(`Week - ${i}`);
		}
		return {
			settlement,
			year,
			timeBatch,
			start,
			end,
			timeBatchs
		};
	} catch (err) {
		throwError(err);
	}
};
new CronJob(
	'0 15,20 * * *',

	// 0 0 * * 0, its run every sunday midnight
	function () {
		findOutUnpaid();

		// Get the time slot that contains today's date
		// let todayTimeSlot = getTodayTimeSlot(timeSlots);
		// riderPay(new Date());
		// Print the result
		// sellerProductExcel({ selle: 'ss' });
	},
	null,
	true
);

export const riderPay = async (date) => {
	try {
		let endTime = endOfWeek(date);
		let startTime = startOfWeek(date, { weekStartsOn: 1 });
		let timeBatch = getWeek(startTime);
		// match  query  commented for testing purposes
		let sets = await Attendance.aggregate([
			{
				$match: {
					createdAt: {
						$lte: endTime,
						$gte: startTime
					}
				}
			},
			{
				$unwind: {
					path: '$penalty',

					preserveNullAndEmptyArrays: true
				}
			},
			{
				$group: {
					_id: '$riderId',
					count: { $sum: 1 },
					activeHours: { $sum: '$activeHours' },
					penalty: { $sum: '$penalty.charges' },
					earn: { $sum: '$todayEarnings' },
					incentive: { $sum: '$dailyIncentive' },
					surge: { $sum: '$surgeCharges' },
					rejectedOrders: { $addToSet: '$rejctedOrders' },
					hasRejectedOrders: {
						$addToSet: {
							$cond: [{ $eq: [{ $size: '$rejctedOrders' }, 0] }, false, true]
						}
					}
				}
			}
		]);
		sets.forEach((set) => {
			set.hasRejectedOrders = set.hasRejectedOrders[0];
			delete set.rejectedOrders;
		});
		let settlementWithFloatingCash = await Rider.populate(sets, {
			path: '_id',
			select: 'floatingCash rating'
		});

		let settlements = [];
		let riderUpdateArray = [];
		settlementWithFloatingCash.forEach((x: any) => {
			let zeroRejectionIncentive = 0;
			let rating = x._id.rating.overAll;
			let ratingBonus = 0;
			if (rating >= 4.7 && rating <= 4.9) {
				ratingBonus = 500;
			} else if (rating == 5) {
				ratingBonus = 1000;
			}
			if (x.earn) {
				zeroRejectionIncentive = x.hasRejectedOrders ? 0 : 250;
			}

			let pay = x.earn + x.incentive + x.surge + zeroRejectionIncentive + ratingBonus;

			let payablAmount = pay < x._id.floatingCash ? 0 : pay - x._id.floatingCash;
			let reduceFloatingCash = pay < x._id.floatingCash ? pay : x._id.floatingCash;
			let settlement = {
				paid: false,
				rider: x?._id?._id,
				startDate: startTime,
				endDate: endTime,
				timeBatch: timeBatch,
				amount: payablAmount,
				penalties: x.penalty,
				activeHours: x.activeHours,
				floatingCashAdjustment: reduceFloatingCash
			};
			settlements.push(settlement);
			let updateFloatingCash = {
				updateOne: {
					filter: { _id: x._id._id }, // Specify the filter condition for matching documents
					update: { $inc: { floatingCash: -reduceFloatingCash } } // Reduce the value of "fieldToReduce" by 1
				}
			};

			riderUpdateArray.push(updateFloatingCash);
		});
		await Rider.bulkWrite(riderUpdateArray)
			.then((result) => {})
			.catch((error) => {
				console.error(error);
			});
		let createSettlements = await Settlement.insertMany(settlements);
		return { createSettlements, endTime, startTime, timeBatch };
	} catch (error) {
		console.error(error);
	}
};
export const createTimeSlots = (year) => {
	// Define an array to store the time slots
	let timeSlots = [];
	// Define a date object for the first day of the year
	let date = new Date(year, 0, 1);
	// Get the start and end dates of the first week of the year
	let start = startOfWeek(date);
	let end = endOfWeek(date);
	// Loop through the weeks of the year
	while (start.getFullYear() === year) {
		// Get an array of days in the current week
		let days = eachDayOfInterval({ start, end });
		// Loop through the days of the week
		for (let day of days) {
			// Check if the day is Monday or Thursday
			if (isMonday(day)) {
				// Create a time slot object with the start and end dates
				let timeSlot = {
					start: new Date(day),
					end: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 3)
				};
				// Push the time slot object to the array
				timeSlots.push({
					start: startOfDay(timeSlot.start),
					end: endOfDay(timeSlot.end)
				});
			}
			if (isFriday(day)) {
				// Create a time slot object with the start and end dates
				let timeSlot = {
					start: new Date(day),
					end: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 2)
				};
				// Push the time slot object to the array
				timeSlots.push({
					start: startOfDay(timeSlot.start),
					end: endOfDay(timeSlot.end)
				});
			}
		}
		// Increment the start and end dates by one week
		start.setDate(start.getDate() + 7);
		end.setDate(end.getDate() + 7);
	}
	let last = timeSlots.length;

	// Return the array of time slots
	return timeSlots;
};

// Define a function that takes an array of time slots and returns the time slot that contains today's date
export const getTodayTimeSlot = (timeSlots) => {
	let today = new Date();
	let index = timeSlots.findIndex((timeSlot) => isWithinInterval(today, timeSlot));
	// If the index is not -1, return an object with the index and the time slot
	if (index !== -1) {
		return { index, timeSlot: timeSlots[index] };
	}
	//
};
new CronJob(
	'0 11,22 * * 1,5',
	//run  every monday and friday 4 pm
	function () {
		settelementsOfSeller();
	},
	null,
	true
);

export const settelementsOfSeller = async (timeBatch = null, year = null) => {
	try {
		let start, end;

		if (timeBatch === null) {
			// Function is called by cron job
			let slots = createTimeSlots(new Date().getFullYear());
			let previousSlotIndex = getTodayTimeSlot(slots).index - 1;
			let previousSlot = slots[previousSlotIndex];
			timeBatch = previousSlotIndex + 1;
			start = previousSlot.start;
			end = previousSlot.end;
		} else {
			let slots = createTimeSlots(year);
			let todaySlot = slots[timeBatch - 1];
			start = todaySlot.start;
			end = todaySlot.end;
		}
		let allsellers = await Seller.find({ approved: true }).select('deliveryMode email');

		for (let seller of allsellers) {
			await sellerSettelement(
				seller._id,
				true,
				seller?.deliveryMode?.platform.freeDeliveryAmount || Number.MAX_SAFE_INTEGER,
				timeBatch,
				start,
				end,
				seller.email,
				false
			);
		}
		return {
			start,
			end
		};
	} catch (err) {
		console.error(err);
	}
};

export const sellerSettelement = async (
	sellerId,
	hasPan,
	freeDeliveryAmount,
	timeBatch,
	startDate,
	endDate,
	email,
	download
) => {
	let netSellerSettelement = 0;
	let allOrderTDs = 0;
	let allOrdersTcs = 0;
	let allRefund = 0;

	let deliveryTcs = 0;
	let deliveryTds = 0;
	let deliveryQuickiii = 0;
	let deliveryByShope = 0;
	let deliveryCommission = 0;
	let deliveryInsurance = 0;
	let deliveryGateway = 0;
	let deliveryGst = 0;
	let deliveredOrders = 0;
	let amountDelivered = 0;
	let seller_Sponsored_Delivery_Fee = 0;
	let allOrders = await Order.find({
		seller: sellerId,
		createdAt: {
			$lte: endDate,
			$gte: startDate
		}
	}).populate('coupon');

	let orderWithHeads = [
		[
			'Order Date',
			'Order No',
			'Order Status',
			'Order Total Amt(Collected From Buyer)',
			'Order Net Amt',
			'GST Amt',
			'GST Deduction U/S 9(5)',
			'U/S 9(5) Items Total',
			'Seller sponsored (Delivery Fee)',
			'Delivered By',
			'Self Delivery',
			'Quickiii Delivery',
			'Insured Value',
			'Insurance Charges (A)',
			'Gateway Charges (B)',
			'Quickiii Service Fee (C)',
			'Gst on Service (18% on A + B + C)',
			'Payment Mode',
			'Total Customer Payable',
			'TCS',
			'TDS',

			'Merchant Share(Discount)',
			'Platform Share(Discount)',
			'Refund',
			'Net Settlement to Seller',
			'Coupon'
		]
	];
	if (allOrders.length == 0) {
		return;
	}
	allOrders
		.filter((order, index) => order.delivered.status || order.returned.status)
		.forEach((order: IOrder) => {
			let sellerShare = 0;
			let sellerDiscount = 0;
			let platformDiscount = 0;
			let sellerPaybal = 0;
			let restaurantItemsAmt = tf2(order.commission.restaurantGst / 5) * 100;
			let sellerSponseredDeliverFee =
				order.order.totalAmt >= order.freeDeliveryAmt && order.deliveryMode.value == 0
					? order.deliveryMode.base
					: 0;

			if (order?.deliveryMode?.methodChanged) {
				sellerSponseredDeliverFee -= order.deliveryMode.charges;
			}
			if (order?.coupon) {
				if (order.coupon.type !== 'delivery') {
					order.coupon.providedBy == 'seller'
						? (sellerDiscount = order.couponDeduction)
						: (platformDiscount = order.couponDeduction);
				} else if (order.coupon.type == 'delivery') {
					sellerSponseredDeliverFee =
						order.coupon.providedBy == 'seller' ? order.deliveryMode.base : 0;
				}
			}
			let gatewayCharges =
				order.paymentMode == 'cod' && order.deliveryMode.value == 1
					? 0
					: (order.order.totalAmt + order.deliveryMode.charges + platformDiscount) *
					  0.01 *
					  gatewayChargesRate;

			let insurance = order.commission.insurance;
			let serviceCharge = tf2(
				order.commission.netAmt + gatewayCharges + order.commission.insurance
			);

			let refund = 0;

			let sellerDeliveryFee = order.deliveryMode.value == 1 ? order.deliveryMode.charges : 0;
			let platformDeliveryFee =
				order.deliveryMode.value == 0 ? order.deliveryMode.charges : 0;

			let orderDeliveredBy = order.deliveryMode.display;

			let orderTds = 0;

			let gstOnService = tf2(serviceCharge * 0.18);
			let totalCustomerPay = order.order.totalAmt + order?.deliveryMode?.charges;
			let discount = tf2(
				(order?.order?.totalAmt / (100 - order.order.discount)) * order.order.discount
			);

			if (order.delivered.status) {
				deliveryTcs += order.commission.tcs;
				deliveryTds += orderTds;
				deliveryQuickiii += deliveryByShope = 0;
				deliveryCommission += order.commission.totalAmt;
				deliveryInsurance += tf2(order.commission.insurance * 1.18);
				deliveryGateway += tf2(gatewayCharges * 1.18);
				deliveryGst += order.commission.restaurantGst;
				deliveredOrders += 1;
				amountDelivered += order.order.totalAmt + platformDiscount;
				seller_Sponsored_Delivery_Fee += sellerSponseredDeliverFee;
				// when order  delivered by platform payment mode  cod or prepaid
				if (order.deliveryMode.value == 0) {
					sellerShare =
						order.order.totalAmt +
						platformDiscount -
						sellerSponseredDeliverFee -
						order.commission.tcs -
						orderTds -
						order.commission.restaurantGst -
						serviceCharge -
						serviceCharge * 0.18;
				}
				// when  order delivered by shop, payment mode is  cod , in this case  seller share is negative that is amt platform delivery charges
				if (order.deliveryMode.value == 1 && order.paymentMode == 'cod') {
					sellerShare =
						-(
							order.commission.restaurantGst +
							order.commission.insurance +
							order.commission.netAmt +
							(order.commission.insurance + order.commission.netAmt) * 0.18
						) + platformDiscount;
				} // when order delivered by shop payment mode is Prepaid
				if (order.deliveryMode.value == 1 && order.paymentMode == 'online') {
					sellerShare =
						order.order.totalAmt +
						platformDiscount -
						order.commission.restaurantGst -
						order.commission.tcs -
						serviceCharge -
						serviceCharge * 0.18;
				}
			}
			if (order.returned.status) {
				if (order.commission.insuredItemValue > 0) {
					let insuranceAmt = order.commission.insuredItemValue;
					let insuredCommissionAmt = order.commission.insuredItemCommission;
					sellerShare =
						insuranceAmt * 0.9 - (order.deliveryMode.charges + gatewayCharges);
				}

				//  restaurant or Non Restaurant and  insured or uninsured  and seller mistake and cod
				//
			} else if (order.cancelled.status) {
				orderTds = 0;
				order.commission.tcs = 0;
				// cancelledOrder.numberOfOrders += 1;
				// cancelledOrder.itemTotal += order.order.totalAmt - order.commission.restaurantGst;
				// cancelledOrder.discount += platformDiscount + sellerDiscount;
				// cancelledOrder.gstOnOrders += order.order.gstAmt;
				// cancelledOrder.packingAndService += tf2(
				// 	gatewayCharges + insurance + order.commission.totalAmt
				// );
			} else if (order.rejected.status) {
				orderTds = 0;
				order.commission.tcs = 0;
				// rejectedOrder.numberOfOrders += 1;
				// rejectedOrder.itemTotal += order.order.totalAmt - order.commission.restaurantGst;
				// rejectedOrder.discount += platformDiscount + sellerDiscount;
				// rejectedOrder.gstOnOrders += order.order.gstAmt;
				// rejectedOrder.packingAndService += tf2(
				// 	gatewayCharges + insurance + order.commission.totalAmt
				// );
			}
			let num = order._id.toString();
			orderWithHeads.push([
				format(order.createdAt, 'yyyy-MM-dd'),
				num,
				order.currentStatus.status,
				order.order.totalAmt + order.deliveryMode.charges,
				order.order.totalAmt,
				order.order.gstAmt || 0,
				order.commission.restaurantGst || 0,
				restaurantItemsAmt,
				sellerSponseredDeliverFee,
				orderDeliveredBy,
				sellerDeliveryFee,
				platformDeliveryFee,
				order.commission.insuredItemValue,
				insurance,
				gatewayCharges,
				order.commission.netAmt,
				gstOnService,
				order.paymentMode,
				totalCustomerPay,
				order.commission.tcs,
				orderTds,
				sellerDiscount,
				platformDiscount,
				refund,
				sellerShare,
				order?.coupon?.name || 'No Coupon Applied'
			]);
			netSellerSettelement += sellerShare || 0 + refund || 0;
			allOrderTDs += orderTds;
			allOrdersTcs += order.commission.tcs;
			allRefund += refund;
		});
	netSellerSettelement = +netSellerSettelement.toFixed(2);
	const createSettlement = new Settlement({
		seller: sellerId,
		startDate: startDate,
		endDate: endDate,
		timeBatch: timeBatch,
		amount: netSellerSettelement
	});
	try {
		await createSettlement.save();
		// Handle success if needed
	} catch (error) {
		// Handle the error
		console.error('Error saving settlement:', error);
		// Respond with an appropriate error message or perform any necessary actions
	}

	let secondData = [
		['Payout Invoice'],
		['Particulars', '', 'Delivered', 'Returned'],
		['Orders', '', deliveredOrders],
		['Amounts', '', amountDelivered],
		['Discount'],
		['Quickiii Services', '', deliveryCommission],
		['Insurance', '', deliveryInsurance],
		['Gateway', '', deliveryGateway],
		['Seller sponsored (Delivery Fee)', seller_Sponsored_Delivery_Fee],
		['TDS', '', deliveryTds],
		['TCS', '', deliveryTcs],
		[],
		['GST Deduction U/S 9(5)', '', deliveryGst],
		[],
		['Adjustments'],
		['Penalites', '', 0],
		['Add', '', 0],
		['Refund', '', allRefund],

		['Net Seller Share', '', netSellerSettelement]
	];
	const workbook = XLSX.utils.book_new();
	const worksheet = XLSX.utils.aoa_to_sheet(orderWithHeads);
	const worksheet2 = XLSX.utils.aoa_to_sheet(secondData);
	//  const worksheet3 = XLSX.utils.aoa_to_sheet(thirdData);

	// Apply the style to the first row

	XLSX.utils.book_append_sheet(workbook, worksheet, 'All Orders');
	XLSX.utils.book_append_sheet(workbook, worksheet2, 'Payout Invoice');
	if (download) {
		return workbook;
	}
	// XLSX.utils.book_append_sheet(workbook, worksheet3, 'Penalites');
	const excelBuffer = XLSX.write(workbook, { type: 'buffer' });
	if (new Date().getHours() == 22) {
		sendEmail({
			to: email || 'lineo3551@gmail.com',
			subject: `QUICKII ORDERS REPORT: ${
				allOrders[0]?.sellerDetails?.name ?? sellerId
			} ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`,
			text: 'Order details',
			attachments: [
				{
					filename: `${allOrders[0]?.sellerDetails?.name ?? sellerId} ${format(
						startDate,
						'yyyy-MM-dd'
					)} to ${format(endDate, 'yyyy-MM-dd')} Orders Report.xlsx`,
					content: excelBuffer,
					contentType: 'application/octet-stream'
				}
			]
		});
	}
};
export const sellerBeneficiary = async (data) => {
	try {
		let { timeBatch, year } = data;
		let today = new Date();

		if (!year) {
			year = getYear(today);
		}
		let slots = createTimeSlots(year);

		let slot;
		if (!timeBatch) {
			let current = getTodayTimeSlot(slots);
			timeBatch = current?.index + 1;
			slot = current?.timeSlot;
		} else {
			slot = slots[timeBatch - 1];
		}
		let { start, end } = slot;
		// timeBatch = slot.index + 1;/

		let approvedSeller = await Seller.find({
			beneficiaryCreated: false,
			approved: true
		}).select('bankDetails contact addresses');

		return approvedSeller;
	} catch (err) {
		throwError(err);
	}
};
export const beneficiaryExcel = async (res, body) => {
	try {
		let approvedSeller = await Seller.find({
			beneficiaryCreated: false,
			approved: true
		}).select('bankDetails contact addresses businessName');

		const list = [
			[
				'BenCode',
				'BenName',
				'Address1',
				'Address2',
				'City',
				'State',

				'Zip_code',
				'Phone',
				'Email',
				'Beneficiary_Account_No',
				'Input_Only_Internal_Fund_Transfer_Account_No',
				'Delivery_Address1',
				'Delivery_Address2',
				'Delivery_City',
				'Delivery_State',
				'Delivery_Zip_Code',
				'PrintLocation',
				'CustomerID',
				'IFSC',
				'MailTo',
				'NEFT',
				'RTGS',
				'CHQ',
				'DD',
				'IFTO',
				'FirstLinePrint',
				'IMPS'
			]
		];
		let sellers = [];
		approvedSeller.forEach((seller: ISeller) => {
			let uniqueId = seller._id.toString();

			let lastFour = uniqueId?.substring(uniqueId.length - 4);
			const firstFourChars = seller?.businessName
				?.substring(0, 4)
				?.replace(/[^a-zA-Z0-9]/g, '');
			const date = new Date();
			let beni = [
				firstFourChars + lastFour,
				seller.bankDetails?.beneficiaryName,
				seller.addresses[0].line1,
				seller.addresses[0].line2,
				seller.addresses[0].city,
				seller.addresses[0].state,
				seller.addresses[0].pincode,
				seller.contact,
				'',
				seller.bankDetails.accountNumber,
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'',

				seller.bankDetails.ifscNumber,
				'',
				'Y',
				'Y',
				'Y',
				'Y',
				'',
				'',
				'Y'
			];
			list.push(beni);
		});

		// res.setHeader('Content-Disposition', 'attachment; filename="seller-beneficiary.xlsx"');
		// res.setHeader('Content-Type', 'application/octetstream');
		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.aoa_to_sheet(list);
		XLSX.utils.book_append_sheet(workbook, worksheet, 'sett');
		return workbook;
	} catch (error) {
		console.error(error);
	}
};
export const riderBeneficiary = async (body) => {
	try {
		let approvedRider = await Rider.find({
			beneficiaryCreated: false,
			approved: true
		}).select('bankDetails contact addresses');

		return approvedRider;
	} catch (err) {
		console.error(err);
	}
};
export const riderBeneficiaryExcel = async (res, body) => {
	try {
		let approvedRider = await Rider.find({
			beneficiaryCreated: false,
			approved: true
		}).select('bankDetails contact name addresses');

		const list = [
			[
				'BenCode',
				'BenName',
				'Address1',
				'Address2',
				'City',
				'State',

				'Zip_code',
				'Phone',
				'Email',
				'Beneficiary_Account_No',
				'Input_Only_Internal_Fund_Transfer_Account_No',
				'Delivery_Address1',
				'Delivery_Address2',
				'Delivery_City',
				'Delivery_State',
				'Delivery_Zip_Code',
				'PrintLocation',
				'CustomerID',
				'IFSC',
				'MailTo',
				'NEFT',
				'RTGS',
				'CHQ',
				'DD',
				'IFTO',
				'FirstLinePrint',
				'IMPS'
			]
		];

		approvedRider.forEach((rider: IRider) => {
			let uniqueId = rider._id.toString();

			let lastFour = uniqueId?.substring(uniqueId.length - 4);
			const firstFourChars = rider?.name?.substring(0, 4)?.replace(/[^a-zA-Z0-9]/g, '');

			let beni = [
				firstFourChars + lastFour,

				rider.name,
				rider.addresses[0].line1,
				rider.addresses[0].line2,
				rider.addresses[0].city,
				rider.addresses[0].state,
				rider.addresses[0].pincode,
				rider.contact,
				'',
				rider.bankDetails.accountNumber,
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				'',

				rider.bankDetails.accountNumber,
				'',
				'Y',
				'Y',
				'Y',
				'Y',
				'',
				'',
				'Y'
			];
			list.push(beni);
		});

		res.setHeader('Content-Disposition', 'attachment; filename="rider-beneficiary.xlsx"');
		res.setHeader('Content-Type', 'application/octetstream');
		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.aoa_to_sheet(list);
		XLSX.utils.book_append_sheet(workbook, worksheet, 'sett');
		return workbook;
	} catch (error) {
		console.error(error);
	}
};

export const createSellerSettlementUsingTimeBatch = async (data) => {
	try {
		const { timeBatch, year } = data;
		if (!timeBatch || !year) {
			throwError(404);
		}
		return settelementsOfSeller(timeBatch, year);
	} catch (error) {
		throwError(404);
	}
};

export const createRiderSettlementUsingTimeBatch = async (data) => {
	try {
		const { timeBatch, year } = data;
		const startDate = setYear(setWeek(new Date(), timeBatch), year);
		const startOfWeekDate = startOfWeek(startDate, { weekStartsOn: 1 });

		let yx = await riderPay(startOfWeekDate);
		return {
			x: format(startDate, 'dd/MM/yyyy, hh:mm:ss a'),
			y: format(startOfWeekDate, 'dd/MM/yyyy, hh:mm:ss a'),
			yx
		}; // Assuming weekStartsOn: 1 for Monday as the start of the week
	} catch (error) {}
};

//create route for updating seller settlement paid status
export const updateSellerSettlementPaidStatus = async (id: string, status: boolean, user) => {
	try {
		// Check if the user is authorized to perform the update
		if (!user._id) {
			throwError(405);
		}

		// Update the paid status of the settlement document
		await Settlement.updateOne(
			{
				_id: id
			},
			{
				$set: {
					paid: status
				}
			}
		);

		return;
	} catch (err) {
		console.error(err);
	}
};

//  download seller products

export const sellerProductExcel = async (sellerId) => {
	try {
		let products = await Product.find({ seller: sellerId })
			.populate('level1 level2 level3 level4')
			.lean();

		let productsExcel = [
			[
				'Id',
				'Product Name',
				'Description',

				'Gst Type',
				'Category',
				'Level 2 SubCategory',
				'Level 3 SubCategory',
				'Level 4 SubCategory',
				'Gst',
				'Price',
				'Selling Price',
				'Veg',
				'Image',
				'Barcode'
			]
		];
		products.forEach((product: any, index) => {
			try {
				let pro = [
					product?._id?.toString(),
					product?.name,
					product?.description,
					product?.minPrice?.gstType,
					product?.level1?.name,
					product?.level2?.name,
					product?.level3?.name,
					product?.level4?.name,
					product?.minPrice?.gst,
					product?.minPrice?.mainPrice + product.minPrice.gstValue,
					product?.minPrice?.sellingPrice,
					product?.veg,
					product?.thumbImages[0]?.image,
					product?.barcode
				];
				productsExcel.push(pro);
			} catch (e) {
				console.error(e);
			}
		});

		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.aoa_to_sheet(productsExcel);
		XLSX.utils.book_append_sheet(workbook, worksheet, 'sett');
		return workbook;
	} catch (error) {
		console.error(error);
	}
};

export const salesReport = async (data) => {
	try {
		let { month, year } = data;

		const salesReport = [
			[
				'OrderType',
				'Transaction Date',

				'Order Id',
				'Invoice No.',
				'Service Invoice No.',
				'Legal Name of Seller',
				'Place of Seller',
				'State code of Seller',
				'State GST Code of Seller',
				'Seller Gst Register',
				'Seller GSTIN',

				'Buyer Address',
				'State Code of Customer',

				'E-commerce operator GSTIN',
				'Order Total Amount(Exclusive Delivery Fee)',
				'U/S 9(5) Items Total',
				' Non-U/S 9(5) Items Total',
				'GST Deduction U/S 9(5)',
				'SC CGST',
				'SC SGST',
				'SC IGST',
				'SC Total GST',

				'Commission(A)',
				'Insurance(B)',
				'Gateway Charges Collected(C)',
				'Penalty(D)',

				'Quickiii Service Charge Including GST(A+B+C+D 18%GST)',
				'Reimbursement of Discount U/S 9(5) Items',
				'TCS Applicable',
				'Total TCS',
				'Total TDS',
				'Coupon',
				'Coupon Name',
				'Coupon Type',
				'Coupon Discount',
				'Delivery Fee (Collected by Quickiii)',
				'Delivery Fee (Paid by Quickiii)',
				'Discount',
				'Cash Back ',
				'Total Collection from Buyer',
				'Payment Method',
				'Seller payable Amount',
				'P&L'
			]
		];
		let invoicePrefix = '';
		year = +year || new Date().getFullYear();
		month = +month || new Date().getMonth();

		if (month <= 2) {
			invoicePrefix += year - 1 + '-' + (year - 2000);
		} else {
			invoicePrefix += year + '-' + (year + 1 - 2000);
		}
		let orderCount = 0;
		let orderCountHelperStr = 100000;
		// Get the start of the month
		const startDate: Date = startOfMonth(new Date(year, month - 1));

		// Get the end of the month
		const endDate: Date = endOfMonth(new Date(year, month - 1));
		// find all sellers
		let sellerServiceNumber = {};

		const allSellers = await Seller.find({}).select('gst businessName deliveryMode');

		for (const seller of allSellers) {
			// one seller 's order in a month
			let orders = await Order.find({
				seller: seller._id,
				createdAt: {
					$gte: startDate,
					$lte: endDate
				},
				'delivered.status': true
			})
				.populate('coupon')
				.sort({ createdAt: 1 });

			if (orders.length > 0) {
				orders.forEach((order: IOrder) => {
					// order total without Delivery Charges
					orderCount++;
					let id = order._id.toString();

					let orderTotal = order.order.totalAmt;
					let gstAmt =
						order.order.gstAmt > order.commission.restaurantGst ||
						order.order.gstAmt == order.commission.restaurantGst
							? order.order.gstAmt - order.commission.restaurantGst
							: order.order.gstAmt; // gst amount includes restaurant  gst charges so  subtract them
					let orderType = 'Non Restaurant';
					if (order.commission.restaurantGst) {
						orderType = 'Restaurant';
					}
					if (order.commission.restaurantGst > 0) {
						if (
							Math.round(order.order.netAmt) >
							Math.round((order.commission.restaurantGst / 5) * 100)
						) {
							orderType = 'Hybrid';
						}
					}
					let invoiceNo = `${invoicePrefix}/${
						orderType == 'Restaurant' ? 'R' : 'NR'
					}/${month}/${(orderCountHelperStr + orderCount).toString().slice(1)}`;

					let transactionDate = format(new Date(order.createdAt), 'yyyy-MM-dd');
					let legalName = seller.businessName; // its will be changed later
					let placeOfSeller = 'Haryana';
					let gstNo = seller.gst;
					let hasGstNo = seller?.gst?.length > 0 ? 'YES' : 'NO';
					let coupon = order?.coupon ? 'YES' : 'NO'; // we are assumed that every seller hold pan card
					let buyer = order.buyerDetails.name;
					let buyerAddress = order.buyerDetails.shippingAddress.city;

					let gatewayCharges = tf2(
						(orderTotal +
							order.deliveryMode.charges +
							(order.couponProvidedBy == 'seller' ? 0 : order.couponDeduction)) *
							0.02
					);
					let quickiiiServices =
						order.commission.netAmt + order.commission.insurance + gatewayCharges;
					let sellerShare = 0;
					let sellerSponseredDeliverFee =
						order.order.totalAmt >= seller.deliveryMode.platform.freeDeliveryAmount &&
						order.deliveryMode.value == 0
							? order.deliveryMode.base
							: 0;
					let paidDeliveryCharges = 0;
					let p_l =
						order.commission.netAmt +
						order.commission.insurance +
						gatewayCharges +
						order.deliveryMode.charges -
						gatewayCharges * 0.4 -
						paidDeliveryCharges -
						order.couponDeduction;

					if (order.deliveryMode.value == 0) {
						sellerShare =
							order.order.totalAmt -
							sellerSponseredDeliverFee -
							order.commission.tcs -
							order.commission.restaurantGst -
							quickiiiServices -
							quickiiiServices * 0.18;
					}
					// when  order delivered by shop, payment mode is  cod , in this case  seller share is negative that is amt platform delivery charges
					if (order.deliveryMode.value == 1 && order.paymentMode == 'cod') {
						sellerShare = -(
							order.commission.restaurantGst +
							order.commission.insurance +
							order.commission.netAmt +
							(order.commission.insurance + order.commission.netAmt) * 0.18
						);
					} // when order delivered by shop payment mode is Prepaid
					if (order.deliveryMode.value == 1 && order.paymentMode == 'online') {
						sellerShare =
							order.order.totalAmt -
							order.commission.restaurantGst -
							quickiiiServices -
							quickiiiServices * 0.18;
					}
					let servicesFeeWithGst = quickiiiServices + quickiiiServices * 0.18;
					let orderAmountAfterTcs = order.order.netAmt - order.commission.tcsAmt;
					// order level report
					let restaurantItemsAmt = tf2(order.commission.restaurantGst / 5) * 100;
					let nonRestaurantItems =
						order.order.totalAmt -
						(restaurantItemsAmt + order.commission.restaurantGst);
					if (!seller[seller.businessName]) {
						seller[seller.businessName] = invoiceNo;
					}
					let serviceInvoiceNumber = seller[seller.businessName];
					if (orderType == 'Hybrid') {
						const totalWithOutRestaurantGst =
							order.order.totalAmt - order.commission.restaurantGst;
						const restaurantGstItemShare =
							restaurantItemsAmt / totalWithOutRestaurantGst;
						const nonRestaurantItemShare = 1 - restaurantGstItemShare;
						const restaurantItemShare =
							totalWithOutRestaurantGst * restaurantGstItemShare;
						const nonRestaurantItems =
							totalWithOutRestaurantGst * nonRestaurantItemShare;
						const nRCommission = order.commission.netAmt * nonRestaurantItemShare;
						const nRInsurance = order.commission.insurance * nonRestaurantItemShare;
						const nRGatewayCharges = gatewayCharges * nonRestaurantItemShare;

						const nRServicesFeeWithGst = servicesFeeWithGst * nonRestaurantItemShare;
						const nRCouponDeduction = order?.couponDeduction * nonRestaurantItemShare;
						const nRDeliveryCharges =
							order.deliveryMode.charges * nonRestaurantItemShare;

						const nRPaidDeliveryCharges = paidDeliveryCharges * nonRestaurantItemShare;
						const nRDiscount = order.couponDeduction * nonRestaurantItemShare;
						const nRReward = order.rewardUse * nonRestaurantItemShare;
						const nRSellerShare = sellerShare * nonRestaurantItemShare;
						const nRP_l = p_l * nonRestaurantItemShare;

						// restaurantItem calculations
						const rCommission = order.commission.netAmt * restaurantGstItemShare;
						const rInsurance = order.commission.insurance * restaurantGstItemShare;
						const rGatewayCharges = gatewayCharges * restaurantGstItemShare;

						const rServicesFeeWithGst = servicesFeeWithGst * restaurantGstItemShare;
						const rCouponDeduction = order?.couponDeduction * restaurantGstItemShare;
						const rDeliveryCharges =
							order.deliveryMode.charges * restaurantGstItemShare;
						const rPaidDeliveryCharges = paidDeliveryCharges * restaurantGstItemShare;
						const rDiscount = order.couponDeduction * restaurantGstItemShare;
						const rReward = order.rewardUse * restaurantGstItemShare;
						const rSellerShare = sellerShare * restaurantGstItemShare;
						const rP_l = p_l * restaurantGstItemShare;
						let rInvoice = invoiceNo + 'I';
						let orderReportNonRest = [
							orderType,
							transactionDate,
							id,
							invoiceNo,
							serviceInvoiceNumber,
							legalName,
							placeOfSeller,

							'06',
							'06',
							hasGstNo,
							gstNo,

							buyerAddress,
							'06',
							'06AAVCA7579CIZ7',
							nonRestaurantItems,
							0,
							nonRestaurantItems,
							0,
							gstAmt / 2,
							gstAmt / 2,
							0,
							gstAmt,

							nRCommission,
							nRInsurance,
							nRGatewayCharges,
							0,

							nRServicesFeeWithGst,
							0,
							order.commission.tcs * 100,
							order.commission.tcs,
							0,
							coupon,
							order?.coupon?.name,
							order?.coupon?.type,
							nRCouponDeduction,
							nRDeliveryCharges,
							nRPaidDeliveryCharges,
							nRDiscount,
							nRReward,
							nonRestaurantItems + nRDeliveryCharges,
							order.paymentMode,
							nRSellerShare,
							nRP_l
						];

						let orderReportRest = [
							orderType,
							transactionDate,
							id,
							rInvoice,
							serviceInvoiceNumber,
							legalName,
							placeOfSeller,

							'06',
							'06',
							hasGstNo,
							gstNo,

							buyerAddress,
							'06',
							'06AAVCA7579CIZ7',
							restaurantItemsAmt,
							restaurantItemsAmt,
							0,
							0,
							0,
							0,
							0,
							0,

							rCommission,
							rInsurance,
							rGatewayCharges,
							0,

							rServicesFeeWithGst,
							0,
							0,
							0,
							0,
							coupon,
							order?.coupon?.name,
							order?.coupon?.type,
							rCouponDeduction,
							rDeliveryCharges,
							rPaidDeliveryCharges,
							rDiscount,
							rReward,
							restaurantItemShare + rDeliveryCharges + order.commission.restaurantGst,
							order.paymentMode,
							rSellerShare,
							rP_l
						];

						salesReport.push(orderReportNonRest, orderReportRest);
					} else {
						let orderReport = [
							orderType,
							transactionDate,
							id,
							invoiceNo,
							serviceInvoiceNumber,
							legalName,
							placeOfSeller,

							'06',
							'06',
							hasGstNo,
							gstNo,

							buyerAddress,
							'06',
							'06AAVCA7579CIZ7',
							order.order.totalAmt,
							restaurantItemsAmt,
							nonRestaurantItems,
							order.commission.restaurantGst,
							gstAmt / 2,
							gstAmt / 2,
							0,
							gstAmt,

							order.commission.netAmt,
							order.commission.insurance,
							gatewayCharges,
							0,

							servicesFeeWithGst,
							0,
							order.commission.tcs * 100,

							order.commission.tcs,
							0,
							coupon,
							order?.coupon?.name,
							order?.coupon?.type,
							order?.couponDeduction,
							order.deliveryMode.charges,
							paidDeliveryCharges,
							order.couponDeduction,
							order.rewardUse,
							order.order.totalAmt + order.deliveryMode.charges,
							order.paymentMode,
							sellerShare,
							p_l
						];

						salesReport.push(orderReport);
					}
				});
			}
		}

		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.aoa_to_sheet(salesReport);
		XLSX.utils.book_append_sheet(workbook, worksheet, 'sett');
		return workbook;
	} catch (error) {
		throwError(error);
	}
};

export const findOutUnpaid = async () => {
	try {
		let settlements = await Settlement.find({
			paid: false,
			seller: {
				$exists: true
			}
		})
			.sort({ timeBatch: 1 })
			.populate({ path: 'seller', select: 'name businessName contact' });
		// convert into table

		let data = '📌 Payment  Pending 📌\n';
		for (let index in settlements) {
			let settlement: any = settlements[index];
			let sellerName: any = settlement?.seller?.businessName || '';
			let str = `${sellerName}    | Date Range ${format(
				settlement.startDate,
				'yyyy-MM-dd'
			)} to ${format(settlement.endDate, 'yyyy-MM-dd')}  | Amount : ${
				settlement.amount
			}  | Time Batch : ${settlement.timeBatch} \n\n`;

			data += str;
		}
		data += '';

		if (settlements.length > 0) {
			sendPendingPaymentToDiscord(data);
		}
		return;
	} catch (error) {}
};

export const allSettlementsBatch = async (data) => {
	try {
		let { batch } = data;

		let settlements = await Settlement.find({
			timeBatch: batch,
			seller: {
				$exists: true
			}
		})
			.populate({
				path: 'seller',
				select: 'businessName'
			})
			.lean();
		let totalSettlements = await Settlement.countDocuments({ seller: { $exists: true } });
		return { timeBatch: settlements.length, settlements, totalSettlements };
	} catch (error) {
		console.log(error);
		throwError(error);
	}
};

export const settlementById = async (id) => {
	try {
		let settlement = await Settlement.find({ _id: id }).populate({
			path: 'seller',
			select: 'businessName'
		});
		return settlement;
	} catch (error) {
		console.log(error);
	}
};
export const deleteSettlement = async (id) => {
	try {
		let settlement = await Settlement.findById(id).populate({
			path: 'seller',
			select: 'businessName'
		});
		let deleteSettelement = await Settlement.deleteOne({ _id: id });
		return settlement;
	} catch (error) {
		console.log(error);
		throwError(error);
	}
};
export const getRiderLongDistanceDetails = async (data) => {
	try {
		let { year, month } = data;
		if (!year) {
			year = new Date().getFullYear();
		}

		month = 9;

		const startDate = startOfMonth(new Date(year, month));
		const endDate = endOfMonth(new Date(year, month));
		let riderObject = {};
		let orders = await Order.find({
			createdAt: { $gte: startDate, $lte: endDate },
			'delivered.status': true
		})
			.populate('rider')

			.select('rider distanceTraveled createdAt')
			.sort('rider')

			.lean();

		let excel = [
			[
				'Rider Name',
				'Order Date',
				'Buyer to Seller',
				'Rider to Seller',
				'Total Distance',
				'long Distance Earning'
			]
		];

		for (let index in orders) {
			let order: any = orders[index];
			if (riderObject[order.rider.name]) {
				riderObject[order.rider.name].total++;
			} else {
				riderObject[order.rider.name] = {
					name: order.rider.name,
					total: 1,
					longDistance: 0,
					amount: 0
				};
			}
			let orderDate = format(order.createdAt, 'yyyy-MM-dd');
			let longDistance = 0;
			if (order.distanceTraveled.totalDistance > 6) {
				riderObject[order.rider.name].longDistance++;
				let distance = order.distanceTraveled.totalDistance - 6;
				if (distance <= 2) {
					longDistance += distance * 5;
				} else {
					longDistance += 2 * 5;
					longDistance += (distance - 2) * 7;
				}
			}
			longDistance = tf2(longDistance);
			riderObject[order.rider.name].amount += longDistance;
			let orderDetails = [
				order.rider?.name,
				orderDate,
				order.distanceTraveled.buyerToSeller,
				order.distanceTraveled.riderToSeller,
				order.distanceTraveled.totalDistance,
				longDistance
			];
			excel.push(orderDetails);
		}

		for (let i in riderObject) {
			let rider = riderObject[i];
			excel.push(
				[],
				[rider.name],
				['Total Orders', rider.total],
				['Long Distance Orders', rider.longDistance],
				['Long Distance Payment', rider.amount]
			);
		}
		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.aoa_to_sheet(excel);
		XLSX.utils.book_append_sheet(workbook, worksheet, 'sett');

		// let wb = XLSX.utils.book_new();

		return workbook;
	} catch (e) {
		console.error(e);
		throwError(500);
	}
};
new CronJob(
	'* * * * *',
	function () {
		monthPaidSettlement({});
	},
	null,
	true
);

export const monthPaidSettlement = async (data) => {
	try {
		let { year, month } = data;
		if (!year) {
			year = new Date().getFullYear();
		}

		month = 9;

		const startDate = startOfMonth(new Date(year, month));
		const endDate = endOfMonth(new Date(year, month));
		let settlements = await Settlement.find({
			createdAt: {
				$gte: startDate,
				$lte: endDate
			},
			seller: { $exists: true },
			paid: true
		})
			.populate({ path: 'seller', select: 'businessName' })
			.sort('createdAt');

		const excel = [['Date', 'Seller Name', 'Start Date', 'End Date', 'Amount', 'Paid']];

		for (let index in settlements) {
			let settlement: any = settlements[index];
			let start = format(settlement.startDate, 'yyyy-MM-dd');

			let end = format(settlement.endDate, 'yyyy-MM-dd');
			let Date = format(settlement.createdAt, 'yyyy-MM-dd');

			excel.push([Date, settlement.seller.businessName, start, end, settlement.amount]);
		}

		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.aoa_to_sheet(excel);
		XLSX.utils.book_append_sheet(workbook, worksheet, 'sett');
		return workbook;
	} catch (e) {}
};
