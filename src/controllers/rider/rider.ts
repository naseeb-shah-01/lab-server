import { setSessionById, getSessionById } from '../../helpers/server-helper';
import { model, Types } from 'mongoose';
import { Request, Response } from 'express';
var ifsc = require('ifsc');

import { IRider } from '../../models/rider/rider';
import { IOrder } from '../../models/order/order';
import { IPenalty } from '../../models/general/penalty';
import { IAttendance } from '../../models/rider/workingHours';
import { throwError } from '../../helpers/throw-errors';
import { deletePrivateProps } from '../../helpers/query';
import { createAdminNotification } from '../../helpers/notifications/admin';
import { INotification } from '../../models/notification/notification';
import {
	sendAdminNotification,
	sendSellerNotification,
	sendRiderNotification
} from '../../helpers/notifications/notification';
import {
	format,
	endOfMonth,
	startOfMonth,
	endOfDay,
	startOfDay,
	addMinutes,
	differenceInHours,
	startOfWeek,
	endOfWeek
} from 'date-fns';
import {
	sendSellerFCMNotification,
	sendRiderFCMNotification
} from '../../helpers/notifications/fcm';
import { type } from 'os';
import { createSellerNotification } from '../../helpers/notifications/seller';
import Database from '../../helpers/database';
import { ca } from 'date-fns/locale';
import { CronJob } from 'cron';
import { createRiderNotification } from '../../helpers/notifications/rider';
import { checkNextOrderRiderAvailable } from '../customers/order';
import { getStripText } from '../../helpers/strip-text';
const ObjectId = Types.ObjectId;
const Rider = model<IRider>('Rider');
const Order = model<IOrder>('Order');
const Penalty = model<IPenalty>('Penalty');
const Attendance = model<IAttendance>('Attendance');
const Notification = model<INotification>('Notification');
//  that distance in km ,in this distance rider not able to incentives,that is max  distance which includes in basic salary
export const generalDeliveryDistance = 1;
export const extratDistancePayRate = 6;
export const normalDistancePayRate = 4;
export const riderDutyEndTime = 20;
export const riderCarryMaxCash = 1000;
export const maxCashFine = 200;
export const dailyEarnBasisIncentiveSlab = {
	a: {
		amt: 1000000,
		per: 1.4
	},
	b: {
		amt: 7500000,
		per: 1.3
	},
	c: {
		amt: 5000000,
		per: 1.25
	},
	d: {
		amt: 25000000,
		per: 1.2
	}
};
//  dailyEarnBasisIncentiveSlab per is equal to  percentage  1.4 = 140% net incentive rate 40%
export const getRiderDetails = async (user) => {
	try {
		let rider = await Rider.findById(user?._id).lean();

		if (!rider) {
			throwError(404);
		}
		delete rider.otp;
		delete rider.sessions;
		delete rider.fcmTokens;

		return rider;
	} catch (error) {
		throw error;
	}
};

export const validateBankDetails = async (data, user) => {
	if (
		!data ||
		!data.name ||
		!data.address ||
		!data.address.line1 ||
		!data.address.state ||
		!data.address.city ||
		!data.address.pincode
	) {
		throwError(400);
	}

	const bankDetails = await ifsc
		.fetchDetails(data.ifsc)
		.then((res) => res)
		.catch((err) => {
			throwError(404, err);
		});
	if (!bankDetails?.ADDRESS) {
		throwError(404);
	}
	return bankDetails;
};
export const addPersonalDetails = async (data, user) => {
	try {
		if (
			!data ||
			!data.name ||
			!data.address ||
			!data.address.line1 ||
			!data.address.state ||
			!data.address.city ||
			!data.address.pincode ||
			!data.bankDetails ||
			!data.ifsc ||
			!data.account
		) {
			throwError(400);
		}
		data = deletePrivateProps(data);
		data.addresses = [
			{
				primary: true,
				billing: true,
				...data.address
			}
		];
		data.updatedBy = user?._id;
		data.kycStage = 'kycDocument';
		let rider = await Rider.findByIdAndUpdate(
			user?._id,
			{
				$set: {
					...data,
					bankDetails: {
						ifsc: data.ifsc,
						accountNumber: data.account,
						imps: data.bankDetails.IMPS
					}
				}
			},
			{ new: true, useFindAndModify: false }
		).lean();
		delete rider.otp;
		delete rider.sessions;
		delete rider.fcmTokens;

		return rider;
	} catch (error) {
		throw error;
	}
};

export const updatePersonalDetails = async (data, user) => {
	try {
		if (
			!data ||
			!data.name ||
			!data.address ||
			!data.address.line1 ||
			!data.address.state ||
			!data.address.city ||
			!data.address.pincode
		) {
			throwError(400);
		}

		data = deletePrivateProps(data);

		if (data.kycType === 'seller') {
			data.seller = true;
		} else if (data.kycType === 'buyer') {
			data.buyer = true;
		}

		data.addresses = [
			{
				primary: true,
				billing: true,
				...data.address
			}
		];
		data.updatedBy = user?._id;
		let rider = await Rider.findByIdAndUpdate(
			user?._id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();

		delete rider.otp;
		delete rider.sessions;
		delete rider.fcmTokens;

		return rider;
	} catch (error) {
		throw error;
	}
};

export const validateKyc = async (
	req: Request,
	res: Response,
	data: IRider,
	cb: (upload: boolean) => {},
	file: any
) => {
	let files: any = req;
	let key = files?.files[0]?.fieldname ? files?.files[0]?.fieldname : '';

	cb(true);
};

export const addKycDocument = async (data, files, user) => {
	try {
		if (!files.length) {
			throwError(400);
		}
		let kycDocument = {};

		data = deletePrivateProps(data);

		for (let file of files) {
			if (!kycDocument.hasOwnProperty(file.fieldname)) {
				kycDocument[file.fieldname] = [file.location];
			} else {
				kycDocument[file.fieldname].push(file.location);
			}
		}
		data.kycDocument = kycDocument;

		data.updatedBy = user?._id;
		data.kycStage = 'kycComplete';
		data.kyc = true;
		let rider = await Rider.findByIdAndUpdate(
			user?._id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();
		sendApprovalNotifications(rider);
		if (rider?.seller) {
			const sendNotification = createSellerNotification(
				'SELLER_RIDER_APPROVAL',
				rider.seller.toString(),
				rider
			);
			sendSellerNotification(sendNotification);
		}

		delete rider.otp;
		delete rider.sessions;
		delete rider.fcmTokens;

		return rider;
	} catch (error) {
		throw error;
	}
};

const sendApprovalNotifications = async (rider: any) => {
	try {
		const adminNotification = createAdminNotification(
			rider.kycType === 'seller' ? 'ADMIN_SELLER_APPROVAL' : 'ADMIN_NEW_BUYER',
			null,
			rider
		);
		// sendAdminNotification(adminNotification);
	} catch (error) {
		console.error('Notification Error ', error);
	}
};

export const updateKycDocument = async (data, files, user) => {
	try {
		data = deletePrivateProps(data);
		let kycDocument = data?.kycDocument ? data.kycDocument : {};

		if (files.length) {
			for (let file of files) {
				if (!kycDocument.hasOwnProperty(file.fieldname)) {
					kycDocument[file.fieldname] = [file.location];
				} else {
					kycDocument[file.fieldname].push(file.location);
				}
			}
		}
		data.kycDocument = kycDocument;

		data.updatedBy = user?._id;
		let rider = await Rider.findByIdAndUpdate(
			user?._id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();

		delete rider.otp;
		delete rider.sessions;
		delete rider.fcmTokens;

		return rider;
	} catch (error) {
		throw error;
	}
};

export const isDuplicate = async (contact, userId) => {
	try {
		let rider = await Rider.findOne({
			contact: contact,
			_id: { $ne: userId }
		});
		if (rider) {
			throwError(409);
		}
	} catch (error) {
		throw error;
	}
};

export const checkAndUpdateRiderSessions = async (rider): Promise<IRider> => {
	const removeSessions = [];
	for (const session of rider.sessions) {
		const sessionDetails = await getSessionById(session);
		if (sessionDetails) {
			setSessionById(session, sessionDetails);
		} else {
			removeSessions.push(session);
		}
	}
	if (removeSessions.length) {
		rider = await Rider.findByIdAndUpdate(
			rider._id,
			{
				$pullAll: {
					sessions: removeSessions
				}
			},
			{
				new: true,
				useFindAndModify: false,
				timestamps: false
			}
		).lean();
	}
	return rider;
};

export const requestForRiderApproval = async (rider) => {
	try {
		let riderDetails = await Rider.findByIdAndUpdate(
			rider?._id,
			{
				$set: {
					approved: false
				}
			},
			{ new: true, useFindAndModify: false }
		).lean();

		delete riderDetails.otp;
		delete riderDetails.sessions;
		delete riderDetails.fcmTokens;

		return riderDetails;
	} catch (error) {
		throw error;
	}
};

export const deleteAccount = async (user) => {
	try {
		const dbQuery: any = {
			_id: user._id
		};

		// Delete notifications
		await Notification.deleteMany({ user: user._id, userType: 'rider' });

		// Delete rider
		const deletedUser = await Rider.findOneAndDelete(dbQuery);

		return deletedUser;
	} catch (error) {
		throw error;
	}
};

export const updateRiderLocation = async (user, body) => {
	await Rider.findByIdAndUpdate(
		user._id,
		{
			$set: {
				latestLocation: {
					coordinates: [body.longitude, body.latitude]
				},
				latestLocationTime: new Date()
			}
		},
		{ useFindAndModify: false }
	);
};

export const getRiderLocation = async (id) => {
	let rider = await Rider.findOne({ _id: id }, { addresses: 1 });
	return rider;
};

export const updateRiderAvailability = async (user, available) => {
	let rider = await Rider.findByIdAndUpdate(
		user._id,
		{
			$set: {
				available: available
			}
		},
		{ useFindAndModify: false }
	);
	await ridersAttendanceTimeline(user._id.toString(), available);
	const isDeliveryAvailable = await checkNextOrderRiderAvailable();

	global.io.emit('isDeliveryAvailable', {
		available: isDeliveryAvailable,
		text: getStripText()
	});
};

export const ridersAttendanceTimeline = async (riderId: string, available) => {
	try {
		let currentTimeUtc = new Date();
		let currentTime = new Date(
			currentTimeUtc.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
		);
		let startTimstampToday = startOfDay(currentTime);
		let endTimestampToday = endOfDay(currentTime);

		let newTime = currentTime.getHours() * 60 + currentTime.getMinutes(); // time range in minutes ( 0 - 1440)
		if (available == 'true') {
			let checkPreviousTime = await Attendance.findOneAndUpdate(
				{
					riderId: riderId,
					createdAt: {
						$gte: startTimstampToday,

						$lte: endTimestampToday
					}
				},
				{
					$push: {
						workingIntervals: [{ open: newTime }]
					}
				},
				{
					new: true,
					useFindAndModify: false
				}
			);

			const data = {
				workingIntervals: [{ open: newTime }],
				date: currentTime,
				riderId: ObjectId(riderId)
			};
			if (!checkPreviousTime) {
				let attendance = new Attendance(data);
				await attendance.save();
			}
			let availabl = await checkNextOrderRiderAvailable();
			global.io.emit('isDeliveryAvailable', {
				available: availabl,
				text: getStripText()
			});
		} else {
			let attendance = await Attendance.findOne({
				riderId: riderId,
				createdAt: {
					$gte: startTimstampToday,

					$lte: endTimestampToday
				}
			});

			let openDate = attendance?.workingIntervals;
			let openTime;
			if (openDate) {
				let oldActiveHours = +attendance?.activeHours;
				let lastInterval: any =
					attendance?.workingIntervals[attendance?.workingIntervals.length - 1];
				let intervalInMinutes = newTime - lastInterval?.open;
				let activeHours = +(intervalInMinutes / 60).toFixed(2) + oldActiveHours;

				let intervalStart = addMinutes(startTimstampToday, lastInterval?.open);
				let intervalEnd = addMinutes(startTimstampToday, newTime);
				let orders = await Order.aggregate([
					{
						$match: {
							rider: ObjectId(riderId),
							'delivered.status': true,
							createdAt: {
								$gte: intervalStart,

								$lte: intervalEnd
							}
						}
					},
					{
						$project: {
							rider: 1,
							distanceTraveled: 1,
							returned: 1,
							delivered: 1
						}
					}
				]);

				// let incentives =
				// 	orders.length > 0
				// 		? orders.map((el) => {
				// 				return {
				// 					earnings:
				// 						el.distanceTraveled > generalDeliveryDistance
				// 							? (el.distanceTraveled - generalDeliveryDistance) *
				// 							  6
				// 							: 0,
				// 					orderId: el._id
				// 				};
				// 		  })
				// 		: [];
				// ;
				// let todayEarnings =
				// 	orders.reduce((acc, curr) => {
				// 		if (curr.distanceTraveled >= generalDeliveryDistance) {
				// 			return acc + (curr.distanceTraveled - generalDeliveryDistance) * 4;
				// 		} else {
				// 			return acc;
				// 		}
				// 	}, 0) + +attendance.todayEarnings;
				// ;
				// let penalty = orders.map((el) => {
				// 	return {
				// 		charges: el.order.totalAmt,
				// 		orderId: el._id
				// 	};
				// });

				let ids = await Attendance.findOneAndUpdate(
					{
						'workingIntervals.close': null,
						riderId: riderId,
						createdAt: {
							$gte: startTimstampToday,

							$lte: endTimestampToday
						}
					},
					{
						$set: {
							'workingIntervals.$.close': newTime, // update the first close that matches 1320
							activeHours: activeHours
						}
					},
					{
						useFindAndModify: false
					}
				);
				if (todayIsLastDayOfMonth()) {
					let workingDays = await Attendance.find({
						riderId: riderId,
						date: {
							$gte: new Date(startOfMonth(currentTime))
						}
					});
					workingDays.length > 20 &&
						(await Attendance.findOneAndUpdate(
							{
								riderId: riderId,
								date: { $gte: new Date() }
							},
							{
								$set: {
									monthlySettlement: {
										amount: 5000
									}
								}
							},
							{
								useFindAndModify: false
							}
						));
				}
			}
		}
	} catch (error) {
		throw error;
	}
};

const getBeginningOfTheWeek = (now) => {
	const days = (now.getDay() + 7 - 1) % 7;
	now.setDate(now.getDate() - days);
	now.setHours(0, 0, 0, 0);
	return now;
};
const todayIsLastDayOfMonth = () => {
	let today = new Date().getDate();
	let endMonth = endOfMonth(new Date()).getDate();
	return today == endMonth;
};
export const RiderSalary = async (riderId: string, offset: string) => {
	try {
		let start = getBeginningOfTheWeek(new Date());
		let end = new Date();
		// Get the start and end date from when offest demands the week data.
		if (+offset > 1) {
			start.setDate(start.getDate() - (+offset - 1) * 7);
			start = new Date(start);
			end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
		}

		let attendance = await Attendance.find({
			riderId: riderId,
			date: {
				$gte: start,
				$lte: end
			}
		})
			.populate('incentives,penalty,surge')
			.lean();
		let orderCount = await Order.countDocuments({
			'delivered.date': { $gte: start, $lte: end },
			'delivered.status': true,
			rider: riderId
		});

		let totalWeekData = [];
		let totalSalary = 0;

		attendance.forEach((el, i) => {
			totalWeekData.push({
				dailyEarnings: +el.todayEarnings + +el.dailyIncentive,

				incentives: 0,
				penalty: el.penalty.reduce((accumulator, current) => {
					return accumulator + +current.charges;
				}, 0),
				activeHours: el.activeHours,
				workingIntervals: el.workingIntervals,
				date: el.date
			});
			totalSalary += +el.todayEarnings + +el.dailyIncentive;
		});

		let check = new Date(format(start, 'yyyy-MM-dd'));
		let counter = new Date(format(end, 'yyyy-MM-dd'));
		let l = 0;
		let r = 0;
		if (+offset > 1) {
			// The logic below is for adding the missing date on which rider hasn't worked or earned money in totalWeekData.
			if (totalWeekData.length > 0) {
				let tempWeekData = [];
				while (check < counter) {
					if (check.getDate() !== totalWeekData[r].date.getDate()) {
						let data = {
							dailyEarnings: 0,
							incentives: [],
							penalty: [],
							activeHours: 0,
							workingIntervals: [],
							date: check
						};
						tempWeekData.push(data);
					} else if (check.getDate() == totalWeekData[r].date.getDate()) {
						r < totalWeekData.length - 1 && r++;
					}
					check = new Date(check.getFullYear(), check.getMonth(), check.getDate() + 1);
				}
				totalWeekData = [...totalWeekData, ...tempWeekData];
			} else {
				while (l < 7) {
					totalWeekData.push({
						dailyEarnings: 0,
						incentives: [],
						penalty: [],
						activeHours: 0,
						workingIntervals: [],
						date: check
					});
					check = new Date(check.getFullYear(), check.getMonth(), check.getDate() + 1);
					l++;
				}
			}
		}
		totalWeekData.sort((a, b) => {
			let da = new Date(a.date),
				db = new Date(b.date);
			return db.valueOf() - da.valueOf();
		});

		return { totalSalary, totalWeekData, orderCount };
	} catch (error) {
		throw error;
	}
};
export const RiderMonthlySettlement = async (queryObj, user) => {
	try {
		let start = new Date(queryObj.year, queryObj.month, 1);

		let end = endOfMonth(start);

		let absentDay = 0;
		let monthlySettelement = await Attendance.aggregate([
			{
				$match: {
					riderId: ObjectId(user._id),
					date: { $gte: start, $lte: end }
				}
			},
			{
				$group: {
					_id: '$riderId',
					monthlyEarnings: {
						$sum: '$todayEarnings'
					},
					monthlyIncentive: {
						$sum: '$surgeCharges'
					},
					halfDay: {
						$sum: {
							$cond: [{ $lt: ['$activeHours', 8] }, 1, 0]
						}
					},
					fullDay: {
						$sum: {
							$cond: [{ $gte: ['$activeHours', 8] }, 1, 0]
						}
					},
					count: {
						$sum: 1
					}
				}
			}
		]);

		const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

		let totalWorkingDays =
			monthlySettelement[0]?.halfDay * 0.5 + monthlySettelement[0]?.fullDay || 0;

		absentDay = daysInMonth[+queryObj.month] - totalWorkingDays;
		let result = {
			totalSalary:
				(
					monthlySettelement[0]?.monthlyEarnings + monthlySettelement[0]?.monthlyIncentive
				).toFixed(0) || 0,
			halfDay: monthlySettelement[0]?.halfDay || 0,
			fullDay: monthlySettelement[0]?.fullDay || 0,
			absentDay,
			totalWorkingDays
		};

		return result;
	} catch (error) {
		throw new Error(error);
	}
};

export const getRiderEarningsAndAttendance = async (riderId) => {
	let nowTime = new Date();

	let startMonth = startOfMonth(nowTime);
	let startDayTime = startOfDay(new Date());
	let endDayTime = endOfDay(new Date());

	let startofWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

	let todayAttendence = await Attendance.findOne(
		{
			riderId: riderId,
			date: {
				$gte: startDayTime,
				$lt: endDayTime
			}
		},
		{ activeHours: 1, todayEarnings: 1, surgeCharges: 1 }
	);

	let currentMonthEarnings: any = await Attendance.aggregate([
		{
			$match: {
				riderId: ObjectId(riderId),
				date: {
					$gte: startMonth,
					$lte: endDayTime
				}
			}
		},
		{
			$group: {
				_id: { $month: '$date' },
				earnings: { $sum: '$todayEarnings' },
				incentive: { $sum: '$surgeCharges' },
				count: { $sum: 1 }
			}
		}
	]);
	let currentWeekEarnings: any = await Attendance.aggregate([
		{
			$match: {
				riderId: ObjectId(riderId),
				date: {
					$gte: startofWeek,
					$lte: endDayTime
				}
			}
		},
		{
			$group: {
				_id: '$riderId',
				earnings: { $sum: '$todayEarnings' },
				incentive: { $sum: '$surgeCharges' },

				count: { $sum: 1 }
			}
		}
	]);
	let todayEarning =
		+(todayAttendence?.todayEarnings || 0) + (todayAttendence?.surgeCharges || 0);

	let activeHours = convertDurationToString(+todayAttendence?.activeHours);

	return {
		weekly_Earned: currentWeekEarnings[0]?.earnings + currentWeekEarnings[0]?.incentive || 0,
		monthly_Earned: currentMonthEarnings[0]?.earnings + currentMonthEarnings[0]?.incentive || 0,
		todayEarning,
		activeHours
	};
};

export const imposePenalty = async (data) => {
	try {
		const { riderId, orderId, remark, percentage } = data;
		if (!riderId || !orderId || !remark || !percentage) {
			throwError(404);
		}
		let nowTime = new Date();
		let order = await Order.findOne({ _id: orderId, rider: riderId });
		let startTime = startOfDay(nowTime);
		let endTime = endOfDay(nowTime);
		if (!order) {
			throwError(404);
		}
		let penaltyAmount = +(order.amount * percentage).toFixed(2);
		let attendanceOfOrderDay = await Attendance.findOne({
			riderId: riderId,
			date: { $gte: startTime, $lte: endTime }
		});
		if (attendanceOfOrderDay) {
			attendanceOfOrderDay.penalty = [
				...attendanceOfOrderDay.penalty,
				{
					charges: penaltyAmount,
					orderId: orderId,
					remark: remark
				}
			];
			attendanceOfOrderDay.todayEarnings =
				+attendanceOfOrderDay.todayEarnings - penaltyAmount;
			await attendanceOfOrderDay.save();
		} else {
			let data = {
				penalty: {
					charges: penaltyAmount,
					orderId: orderId,
					remark: remark
				},
				date: new Date(),
				riderId: riderId,
				todayEarnings: -penaltyAmount
			};
			let attendance = new Attendance(data);
			attendance.save();
		}
		return {
			res: 'Penalty Imposed Successfully'
		};
	} catch (error) {
		throwError(error);
	}
};

new CronJob(
	// testing
	// that corn job run everday 9:30 pm
	'30 21 * * *',

	function () {
		addDailyBasisIncentive();
		setRidersAvailableFalse();
	},
	null,
	true
);

new CronJob(
	'0 * * * *',
	function () {
		sendAlertToRiderForFloatingCash();
	},
	null,
	true
);

export const addDailyBasisIncentive = async () => {
	let startTime = startOfDay(new Date());
	let endTime = endOfDay(new Date());
	let orderWithRider = await Order.aggregate([
		{
			$match: {
				createdAt: { $lte: endTime, $gte: startTime },
				'delivered.status': true
			}
		},
		{
			$group: {
				_id: '$rider',
				orderCount: { $sum: 1 }
			}
		}
	]);
	let promiseArray = [];
	for (let rider of orderWithRider) {
		let incentiveValue = 0;
		if (rider.orderCount >= 6 && rider.orderCount < 8) {
			incentiveValue = 65;
		} else if (rider.orderCount >= 8 && rider.orderCount < 11) {
			incentiveValue = 95;
		} else if (rider.orderCount >= 11 && rider.orderCount < 16) {
			incentiveValue = 150;
		} else if (rider.orderCount >= 16 && rider.orderCount < 21) {
			incentiveValue = 200;
		} else if (rider.orderCount > 21) {
			incentiveValue = 300;
		}
		let addIncentive = Attendance.updateOne(
			{
				createdAt: { $lte: endTime, $gte: startTime },
				riderId: rider._id,
				rejctedOrders: { $size: 0 }, // Only match documents where rejectedOrders field size is zero
				activeHours: { $gte: 10 } // if rider active hours  greater and equal 10,only able to getting incentiFve
			},
			{
				$inc: { dailyIncentive: incentiveValue }
			}
		);
		promiseArray.push(addIncentive);
	}
	Promise.all(promiseArray).then((res) => {});
	return;
};

export const blockCODOrderOfRider = async (arrOfRiderIds) => {
	let blockCod = await Rider.updateMany(
		{
			_id: { $in: arrOfRiderIds }
		},
		{
			$set: {
				codBlock: new Date()
			}
		}
	);

	return blockCod;
};
export const unblockCODOrderOfRider = async (arrOfRiderIds) => {
	let unblockCod = await Rider.updateMany(
		{
			_id: { $in: arrOfRiderIds }
		},
		{
			$set: {
				codBlock: null
			}
		}
	);
	return unblockCod;
};

export const sendAlertToRiderForFloatingCash = async () => {
	let riderToSendNotification = await Rider.find(
		{
			codBlock: { $ne: null }
		},
		{
			codBlock: 1,
			floatingCash: 1
		}
	).lean();

	//  add hours to in rider docs
	for (let rider of riderToSendNotification) {
		let hour = differenceInHours(new Date(), rider.codBlock);
		if (hour > 47 && hour % 24 == 0) {
			//  impose Penalty
			await imposePenaltyNonOrder(rider._id, maxCashFine, 'Delay in cash submission');
		}
		//  send notification
		const riderNotification = createRiderNotification(
			'RIDER_SUBMIT_FLOATING_CASH',
			rider._id.toString(),

			null
		);
		sendRiderNotification(riderNotification);
	}
};

export const imposePenaltyNonOrder = async (riderId, amount, remark) => {
	try {
		let penalty = new Penalty({
			userType: 'rider',
			userId: riderId,
			amount: amount,
			remark: remark
		});

		let nowTime = new Date();
		let startTime = startOfDay(nowTime);
		let endTime = endOfDay(nowTime);

		let attendanceOfOrderDay = await Attendance.findOne({
			riderId: riderId,
			date: { $gte: startTime, $lte: endTime }
		});
		if (attendanceOfOrderDay) {
			attendanceOfOrderDay.penalty = [
				...attendanceOfOrderDay.penalty,
				{
					charges: amount,
					orderId: null,
					remark: remark
				}
			];
			attendanceOfOrderDay.todayEarnings = +attendanceOfOrderDay.todayEarnings - amount;
			await attendanceOfOrderDay.save();
		} else {
			let data = {
				penalty: {
					charges: amount,
					orderId: null,
					remark: remark
				},
				date: new Date(),
				riderId: riderId,
				todayEarnings: -amount
			};
			let attendance = new Attendance(data);
			attendance.save();
		}
		await penalty.save();
	} catch (e) {
		throwError(500);
	}
};

//  at 8 pm all   riders are  session close
export const setRidersAvailableFalse = async () => {
	let availableFlase = await Rider.updateMany(
		{},
		{
			$set: {
				available: false
			}
		}
	);
};
// weekly settelement
//  that cronjob is run every sunday at 11.30 pm
new CronJob(
	'30 23 * * 0',
	function () {
		ridersWeeklySettelement();
	},
	null,
	true
);
//
new CronJob(
	'1 0 1 * *',
	function () {
		ridersMonthlySettelement();
	},
	null,
	true
);
export const ridersWeeklySettelement = async () => {
	let currentTime = new Date();
	let startTimstampToday = startOfDay(currentTime);
	let endTimestampToday = endOfDay(currentTime);
	let startofWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
	let endofWeek = endOfWeek(new Date(), { weekStartsOn: 1 });
	let weeklySettelement = await Attendance.aggregate([
		{
			$match: {
				date: { $gte: startofWeek, $lte: endofWeek }
			}
		},
		{
			$group: {
				_id: '$riderId',
				weeklyEarnings: {
					$sum: '$todayEarnings'
				},
				weeklyIncentive: {
					$sum: '$dailyIncentive'
				}
			}
		}
	]);
	for (let attendance of weeklySettelement) {
		let update = await Attendance.findOneAndUpdate(
			{
				riderId: attendance._id,
				createdAt: {
					$gte: startTimstampToday,

					$lte: endTimestampToday
				}
			},
			{
				'weeklySettlement.amount': attendance.monthlyEarnings + attendance.weeklyIncentive
			},
			{
				upsert: true
			}
		);
	}
};
export const ridersMonthlySettelement = async () => {
	let startofMonth = startOfMonth(new Date());
	let endofMonth = endOfMonth(new Date());
	let currentTime = new Date();
	let startTimstampToday = startOfDay(currentTime);
	let endTimestampToday = endOfDay(currentTime);
	// if rider have non order(not related to order)  penalties calucate amount panalties

	let monthlySettelement = await Attendance.aggregate([
		{
			$match: {
				date: { $gte: startofMonth, $lte: endofMonth }
			}
		},
		{
			$group: {
				_id: '$riderId',
				monthlyEarnings: {
					$sum: '$todayEarnings'
				},
				monthlyIncentive: {
					$sum: '$dayIncentive'
				}
			}
		}
	]);
	for (let attendance of monthlySettelement) {
		let update = await Attendance.findOneAndUpdate(
			{
				riderId: attendance._id,
				createdAt: {
					$gte: startTimstampToday,

					$lte: endTimestampToday
				}
			},
			{
				'monthlySettlement.amount': attendance.monthlyEarnings + attendance.monthlyIncentive
			},
			{
				upsert: true
			}
		);
	}
};
function convertDurationToString(hours: number): string {
	const totalMinutes = hours * 60;
	const remainingHours = Math.floor(totalMinutes / 60);
	const minutes = Math.floor(totalMinutes % 60);

	let durationString = '';
	if (remainingHours > 0) {
		durationString += `${remainingHours} Hour${remainingHours > 1 ? 's' : ''}`;
	}
	if (minutes > 0) {
		if (remainingHours > 0) {
			durationString += ' and ';
		}
		durationString += `${minutes} Minute${minutes > 1 ? 's' : ''}`;
	}

	return durationString;
}
