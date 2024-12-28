import { endOfDay, format, startOfDay } from 'date-fns';
import { model, Types } from 'mongoose';
import { createAdminNotification } from '../../helpers/notifications/admin';
import { sendAdminNotification } from '../../helpers/notifications/notification';
import { getResults } from '../../helpers/query';
import { IAreas } from '../../models/locations/goodAreas';

import { IAttendance } from '../../models/rider/workingHours';
import { tf0, tf2 } from '../../helpers/number';
import differenceInMinutes from 'date-fns/differenceInMinutes';
import { getLimit, getPage, getSearch, getSkip, getSort } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { QueryObj } from '../../middlewares/query';
import { IGroupOrder } from '../../models/order/group-order';
import { IOrder, OrderStatus } from '../../models/order/order';

import { IRider } from '../../models/rider/rider';
import { createBuyerNotification } from '../../helpers/notifications/buyer';
import {
	sendBuyerNotification,
	sendSellerNotification
} from '../../helpers/notifications/notification';
import { createSellerNotification } from '../../helpers/notifications/seller';
import { ICustomer } from '../../models/customer/customer';
import { ISeller } from '../../models/customer/seller';
import axios, { AxiosRequestConfig } from 'axios';
import { removeOrders } from '../../helpers/removeOrders';
import { minDistance } from '../../helpers/haversineDistance';
const Attendance = model<IAttendance>('Attendance');
const ObjectId = Types.ObjectId;

const Version = model<IVersion>('Version');
const Order = model<IOrder>('Order');
const Rider = model<IRider>('Rider');
const GroupOrder = model<IGroupOrder>('GroupOrder');
const Customer = model<ICustomer>('Customer');
const Seller = model<ISeller>('NewCustomer');
const Area = model<IAreas>('Areas');
const History = model<IHistory>('History');
import { getSellersByLocationCoordinates } from '../buyer/seller';
import {
	cashSettlement,
	cashSettlementOnDelivery,
	mangeReferral,
	sendDeliveredNotifications,
	sendNotReceivedNotifications,
	sendReturnApprovedNotifications,
	sendReturnedNotifications,
	sendReturnPickupNotifications,
	sendReturnRejectedNotifications
} from '../users/orders';
import { calculateDistance, getDistanceWithGoogle } from '../../helpers/calculateDistance';
import {
	addDailyBasisIncentive,
	extratDistancePayRate,
	generalDeliveryDistance,
	imposePenalty,
	normalDistancePayRate
} from './rider';
import {
	assignRider,
	availableDeliveryOptions,
	checkNextOrderRiderAvailable,
	rejectOrderDueToRider
} from '../customers/order';
import { IVersion } from '../../models/general/version';
import { CronJob } from 'cron';
import { getStripText } from '../../helpers/strip-text';
import { IHistory } from '../../models/general/history';

export const getRiderOrdersByType = async (queryObj: QueryObj, user: any) => {
	try {
		let query = {};
		let type = queryObj.type;
		switch (type) {
			case 'processing':
				query = {
					'accepted.status': true,
					'ready.status': false,
					'dispatched.status': false,
					'cancelled.status': false
				};
				break;
			case 'ready':
				query = {
					'accepted.status': true,
					'ready.status': true,
					'dispatched.status': false,
					'cancelled.status': false
				};
				break;
			case 'shipping':
				query = {
					'dispatched.status': true,
					'delivered.status': false,
					'returned.status': false
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
				break;
			case 'cod':
				query = {
					paymentMode: 'cod',
					'delivered.status': true
				};
				break;
			case 'online':
				query = {
					'delivered.status': true,
					paymentMode: 'online'
				};
				break;
			default:
				break;
		}

		if (queryObj.startDate && queryObj.endDate) {
			let startDate = format(new Date(queryObj.startDate), 'yyyy-MM-dd');
			let dateobj = new Date(queryObj.endDate);
			let endDate = dateobj.toISOString();

			query = {
				createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
				...query
			};
		}

		const dbQuery = {
			rider: user._id,
			...query
		};

		const dbProject = {
			isGroupOrder: 1,
			buyerDetails: {
				name: 1,
				contact: 1,
				shippingAddress: {
					location: 1
				},
				firstOrder: 1
			},
			sellerDetails: {
				name: 1,
				contact: 1,
				shopLocation: 1
			},
			distanceTraveled: 1,
			order: 1,
			items: 1,
			createdAt: 1,
			paymentMode: 1,
			dispatched: { status: 1 },
			rewardUse: 1,
			walletUse: 1,
			accepted: 1,
			deliveryMode: { charges: 1 },
			onlinePayment: {
				status: 1
			},
			currentStatus: { status: 1 },
			ETA: 1,
			commission: { restaurantGst: 1 }
		};
		const results = await getResults(
			queryObj,
			Order,
			dbQuery,
			dbProject,
			null,
			'createdAt',
			-1,
			15
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const getRiderOrderForEarnings = async (queryObj: QueryObj, user: any) => {
	try {
		let query = {};
		let startDate = startOfDay(new Date(queryObj.startDate));
		let dateobj = endOfDay(new Date(queryObj.endDate));
		let endDate = dateobj;

		if (queryObj.type == 'incentive') {
			query = {
				'delivered.date': { $gte: new Date(startDate), $lte: new Date(endDate) },
				'delivered.status': true,
				'distanceTraveled.totalDistance': { $gte: generalDeliveryDistance },
				...query
			};
		} else if (queryObj.type == 'delivered') {
			query = {
				'delivered.date': { $gte: new Date(startDate), $lte: new Date(endDate) },
				'delivered.status': true,

				...query
			};
		} else if (queryObj.type == 'returned') {
			query = {
				'returned.date': { $gte: new Date(startDate), $lte: new Date(endDate) },
				'returned.status': true,
				...query
			};
		}

		let project = {
			sellerDetails: 1,
			buyerDetails: 1,
			order: 1,
			paymentMode: 1,
			createdAt: 1,
			distanceTraveled: 1,
			extraDistanceTraveled: 1
		};
		let result = await Order.aggregate([
			{
				$match: {
					rider: ObjectId(user._id),
					...query
				}
			},
			{
				$addFields: {
					extraDistanceTraveled: {
						$cond: {
							if: {
								$gt: ['$distanceTraveled.totalDistance', generalDeliveryDistance]
							},
							then: {
								$round: [
									{
										$multiply: [
											{
												$subtract: [
													'$distanceTraveled.totalDistance',
													generalDeliveryDistance
												]
											},
											extratDistancePayRate
										]
									},
									2 // round to 2 decimal places
								]
							},
							else: 0
						}
					}
				}
			},
			{
				$project: project
			}
		]);

		return result;
	} catch (error) {
		throw error;
	}
};

export const getOrderById = async (orderId) => {
	try {
		const order = await Order.findById(orderId)
			.populate('items.product', '_id name thumbImages')
			.populate('rejectedItems.product', '_id name thumbImages');

		if (!order) {
			throwError(404);
		}

		return order;
	} catch (error) {
		throw error;
	}
};

export const getTotalOrders = async (user: any) => {
	const order = await Order.find({ buyer: user._id });
	return order.length;
};

export const dispatchOrders = async (
	data: {
		_id: string;
		amount: number;
		period: number;
	}[],
	user
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
			let currentOrder = await Order.findOne({
				_id: order._id
			});
			const isStatusAlreadyExists = currentOrder.statusHistory.some(
				(st) => st.status === 'dispatch'
			);
			if (!isStatusAlreadyExists) {
				currentOrder.statusHistory.push(newStatus);
			}
			currentOrder.dispatched = {
				status: true,
				date: new Date()
			};
			currentOrder.currentStatus = newStatus;
			await currentOrder.save();
			createDispatchNotifications(order._id);
			notifyOrderStatusUpdate(currentOrder.seller, currentOrder.rider);
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

export const changeOrderStatusByRider = async (
	id: string,
	status: OrderStatus,
	data: any,
	user
) => {
	try {
		let order = await Order.findById(id).populate('coupon');
		if (!order) {
			throwError(404);
		}

		const rider = await Rider.findById(order.rider);

		const checkStatuses: OrderStatus[] = [
			'returned',
			'not_received',
			'delivered',
			'return_rejected',
			'return_accepted',
			'return_pickup',
			'abandoned',
			'return_pickup',
			'arrived'
		];

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
			calculateEarningOnOrderReturn(order);
			sendReturnedNotifications(order._id.toString());
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
						amount: order.rewardUse,
						buyer: order.buyer,
						date: new Date(),
						action: 'credit',
						remark: `Order Returned: ${order._id}`
					});
				}
			}
			removeOrders(order);
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
				const buyerNotification = createBuyerNotification(
					'BUYER_CASHBACK_RECIEVED',
					(order.buyer as ICustomer)._id.toString(),
					amount
				);
				await History.create({
					type: 'reward',
					amount: amount,
					buyer: order.buyer,
					date: new Date(),
					action: 'credit',
					remark: 'Cash Back Received'
				});
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

// Suppose that  one rider has one attendance document on at particular date

export const addIncentiveAndEarnings = async (order) => {
	try {
		let nowTime = new Date();
		let startDayTime = startOfDay(nowTime);
		let endDayTime = endOfDay(nowTime);

		let todayAttendenceDoc = await Attendance.findOne({
			riderId: order.rider,
			date: {
				$gte: startDayTime,
				$lt: endDayTime
			}
		});
		if (!todayAttendenceDoc) {
			throw new Error('Attendance not exists');
		}
		if (order.deliveryMode.value == 0) {
			let goodArea = await Area.findOne({
				loc: {
					$geoIntersects: {
						$geometry: {
							type: 'Point',
							coordinates: order.buyerDetails.shippingAddress.location.coordinates
						}
					}
				}
			}).select('deliveryFee abnormalDeliveryFee');
			let deliveryData = goodArea.deliveryFee;

			let surge = deliveryData.surge;
			let surgeCharges = 0;
			surgeCharges += surge ? deliveryData.base.surge : 0;
			let baseCharge = deliveryData.base.charges;
			let charges = baseCharge;
			let distance = Math.trunc(order.distanceTraveled.totalDistance);
			if (distance <= deliveryData.mid.end && distance > deliveryData.base.end) {
				let midKm = tf2(distance - deliveryData.base.end);
				let perKM = deliveryData.mid.charges;
				surgeCharges += surge ? deliveryData.mid.surge * midKm : 0;

				charges += tf2(midKm * perKM);
			} else if (distance > deliveryData.mid.end) {
				let disKm = tf2(deliveryData.mid.end - deliveryData.base.end);
				surgeCharges = surge ? disKm * deliveryData.mid.surge : 0;
				charges += tf2(disKm * deliveryData.mid.charges);
			}
			if (distance <= deliveryData.long.end && distance > deliveryData.mid.end) {
				let disKm = tf2(distance - deliveryData.mid.end);
				surgeCharges = surge ? disKm * deliveryData.long.surge : 0;

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

			todayAttendenceDoc.todayEarnings =
				+todayAttendenceDoc.todayEarnings + Math.trunc(charges);
			todayAttendenceDoc.surgeCharges += Math.trunc(surgeCharges);
		} else {
			todayAttendenceDoc.todayEarnings =
				+todayAttendenceDoc.todayEarnings + Math.trunc(order.deliveryMode.charges);
		}
		await todayAttendenceDoc.save();
	} catch (error) {
		throwError(error);
	}
};

export const calculateEarningOnOrderReturn = async (order: IOrder) => {
	try {
		let orderId = order._id;
		let nowTime = new Date();
		let startDayTime = startOfDay(nowTime);
		let endDayTime = endOfDay(nowTime);
		let todayAttendenceDoc = await Attendance.findOne({
			riderId: order.rider,
			date: {
				$gte: startDayTime,
				$lt: endDayTime
			}
		});
		if (!todayAttendenceDoc) {
			throw new Error('Attendance not exists');
		}

		if (!todayAttendenceDoc) {
			throw new Error('Attendance not exists');
		}
		let deliveryData;
		let deliveryFee;
		if (order.deliveryMode.value == 0) {
			let goodArea = await Area.findOne({
				loc: {
					$geoIntersects: {
						$geometry: {
							type: 'Point',
							coordinates: order.buyerDetails.shippingAddress.location.coordinates
						}
					}
				}
			}).select('deliveryFee abnormalDeliveryFee');
			deliveryData = goodArea.deliveryFee;

			deliveryFee = calculateRiderFee(
				Math.trunc(order.distanceTraveled.totalDistance),
				deliveryData
			);
			todayAttendenceDoc.todayEarnings =
				+todayAttendenceDoc.todayEarnings + Math.trunc(deliveryFee.charges);
			todayAttendenceDoc.surgeCharges += Math.trunc(deliveryFee.surgeCharges);
		} else {
			todayAttendenceDoc.todayEarnings =
				+todayAttendenceDoc.todayEarnings + Math.trunc(order.deliveryMode.charges);
		}

		if (order.deliveryMode.value == 0) {
			await calculateInsuranceSettelement(
				orderId,
				deliveryFee.surgeCharges + deliveryFee.surgeCharges,
				deliveryData
			);
		}

		await todayAttendenceDoc.save();
	} catch (error) {
		throwError(error);
	}
};
export const calculateInsuranceSettelement = async (orderId, riderFee, deliveryData) => {
	try {
		let order = await Order.findOne({ _id: orderId });
		let seller = await Seller.findById(order.seller).select('deliveryMode');
		let deliverySellerSponsored =
			+seller.deliveryMode.selfdelivery.freeDeliveryAmount <= order.order.totalAmt;
		order.returned.returnSettlement = 0;
		let allDeduction = 0;
		if (order.returnRequest.approved.dueTo == 'seller') {
			allDeduction += riderFee + order.commission.totalAmt;

			if (order.returnRequest.approved.returnTo == 'seller') {
				let returnDeliveryFee = calculateRiderFee(
					order.distanceTraveled.buyerToSeller,
					deliveryData
				);
				allDeduction += Math.trunc(
					returnDeliveryFee.surgeCharges + returnDeliveryFee.charges
				);
			}
			let insuredAmt = order.commission.insuredItemValue;
			if (insuredAmt > 0) {
				allDeduction += order.commission.insurance;
			}
		} else {
			let insuredAmt = order.commission.insuredItemValue;

			if (insuredAmt > 0) {
				allDeduction += order.commission.insurance;
			}
			if (order.returnRequest.approved.returnTo == 'seller') {
				// return delivery fee
				allDeduction += riderFee;
			}
			if (deliverySellerSponsored) {
				allDeduction += riderFee;
			}
		}
		//   buyer settlement  at time  order return
		if (order.returnRequest.approved.dueTo == 'buyer') {
			let buyer = await Customer.findById(order.buyer);
			if (order.paymentMode == 'online') {
				let deliveryChargesWithGst = tf0(order.deliveryMode.charges * 0.001 * 118);

				buyer.rewardBalance += order.order.totalAmt - deliveryChargesWithGst;
			} else {
				let deliveryChargesWithGst = tf0(order.deliveryMode.charges * 0.001 * 118);

				buyer.rewardBalance -= deliveryChargesWithGst;
			}
		}

		let insuranceCover = tf2(order.commission.insuredItemValue * 0.9 - allDeduction);

		order.returned.returnSettlement = insuranceCover;
		// get ratio of insured  restaurant items vs all insured items
		let reducePercent = tf2(
			order.commission.insuredRestItemValue / order.commission.insuredItemValue
		);
		// reduce amount insured and restaurant item value against allDeduction
		order.commission.insuredRestItemValue -= tf2((allDeduction || 0) * (reducePercent || 0));
		await order.save();
		return;
	} catch (error) {
		console.error(error);
	}
	// tds calculation will be at the time excel sheet generate
};

export const getActiveOrders = async (riderId) => {
	try {
		let rider = await Rider.findById(riderId._id).select('activeOrders');
		let activeOrders = rider?.activeOrders?.length || 0;
		return {
			activeOrders
		};
	} catch (err) {
		throwError(err);
	}
};

export const riderOrderAcceptance = async (data, user) => {
	try {
		const { orderId, status } = data;
		let order = await Order.findOne({ _id: orderId });

		if (status == 'rejected') {
			if (order.deliveryMode.value == 1) {
				const riders = await Rider.findOne({
					status: 'active',
					approved: true,
					sellerApproved: true,
					available: true,
					seller: order.seller
				});
				order.rider = riders._id;
				await order.save();
				riders.activeOrders.push(order._id);
				await riders.save();
			} else {
				//  remove order from the acitive order array
				let remove = await Rider.updateOne(
					{ _id: user._id }, // Specify the document you want to update
					{ $pull: { activeOrders: order._id } } // Specify the array field and the value to be pulled
				);

				let currentTime = new Date();
				let startDate = startOfDay(currentTime);
				let endDate = endOfDay(currentTime);
				let attendance = await Attendance.findOne({
					riderId: user._id,
					createdAt: {
						$gte: startDate,
						$lte: endDate
					}
				});

				attendance.rejctedOrders.push(orderId);
				await attendance.save();
				order.rider = null;
				//  reassing order rider

				// Find all approved riders in the serviceable area
				let activeRiderVersion = await Version.findOne({
					appName: 'rider-mobile',
					latest: true
				}).select('metadata');
				let maxOrderPerRider = activeRiderVersion?.metadata?.maxOrderPerRider || 1;

				const riders = await Rider.find({
					status: 'active',
					approved: true,
					seller: {
						$exists: false
					},
					_id: { $ne: user._id },
					$expr: { $lt: [{ $size: '$activeOrders' }, maxOrderPerRider] },

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
				let availableRider = riders.find(
					(el) => el.activeOrders?.length == 0 && el.available
				);

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
					order.distanceTraveled.riderToSeller = distance.distance2;
					order.distanceTraveled.buyerToSeller = distance.distance1;
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
			}
		} else {
			if (order.currentStatus.status !== 'cancelled') {
				let newStatus = {
					status: 'rider_accepted' as OrderStatus,
					date: new Date(),
					by: order.rider.toString()
				};

				//check to prevent duplicate
				const existingStatus = order.statusHistory.some(
					(status) => status.status === 'rider_accepted'
				);

				if (!existingStatus) {
					order.statusHistory.push(newStatus);
					order.currentStatus = newStatus;
				}

				order.riderAccepted.accepeted = true;
				order.riderAccepted.date = new Date();
			}
		}
		await order.save();
		notifyOrderStatusUpdate(order.seller, order.rider);
		return;
	} catch (e) {
		console.error(e);
	}
};

export const calculateRiderFee = (distance, deliveryData) => {
	try {
		let surge = deliveryData.surge;
		let surgeCharges = 0;
		surgeCharges += surge ? deliveryData.base.surge : 0;
		let baseCharge = deliveryData.base.charges;
		let charges = baseCharge;

		if (distance <= deliveryData.mid.end && distance > deliveryData.base.end) {
			let midKm = tf2(distance - deliveryData.base.end);
			let perKM = deliveryData.mid.charges;
			surgeCharges += surge ? deliveryData.mid.surge * midKm : 0;

			charges += tf2(midKm * perKM);
		} else if (distance > deliveryData.mid.end) {
			let disKm = tf2(deliveryData.mid.end - deliveryData.base.end);
			surgeCharges = surge ? disKm * deliveryData.mid.surge : 0;
			charges += tf2(disKm * deliveryData.mid.charges);
		}
		if (distance <= deliveryData.long.end && distance > deliveryData.mid.end) {
			let disKm = tf2(distance - deliveryData.mid.end);
			surgeCharges = surge ? disKm * deliveryData.long.surge : 0;

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
			surgeCharges,
			charges
		};
	} catch (e) {
		console.error(e);
	}
};

export const notifyOrderStatusUpdate = async (sellerId, riderId) => {
	try {
		const seller = await Seller.findById(sellerId, 'sockets').lean();
		const rider = await Rider.findById(riderId, 'sockets').lean();
		if (seller) {
			for (let socketId of seller.sockets) {
				const socket = global.io.sockets.sockets.get(socketId);
				socket.emit('orderStatusUpdated');
			}
		}

		if (rider) {
			for (let socketId of rider.sockets) {
				const socket = global.io.sockets.sockets.get(socketId);
				socket.emit('orderStatusUpdated');
			}
		}
	} catch (error) {
		console.error(error);
	}
};
export const probabilisticNumber = (number: number): number => {
	if (Math.random() < 0.0001) {
		return number;
	} else {
		let maxDiscount = 20;
		if (number > 200) {
			maxDiscount = 50;
		} else if (number < 200 && number > 150) {
			maxDiscount = 45;
		} else if (number < 150 && number > 100) {
			maxDiscount = 35;
		}
		return generateNumber(maxDiscount);
	}
};
const generateNumber = (max: number): number => {
	const min = 10;

	return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const setDeliveryAddressPrimary = (buyer: ICustomer, deliveryAddGoogleId: any) => {
	try {
		let updateAddress = buyer.addresses.map((add: any) => {
			if (add?.googlePlaceId == deliveryAddGoogleId) {
				return { ...add._doc, primary: true };
			} else {
				return { ...add._doc, primary: false };
			}
		});

		buyer.addresses = updateAddress;
	} catch (err) {
		console.error(err);
	}
};
