import { model, Types } from 'mongoose';
import { QueryObj } from '../../middlewares/query';
import { ICustomer } from '../../models/customer/customer';
import { INotification } from '../../models/notification/notification';
import { IGroupOrder } from '../../models/order/group-order';
import { IOrder } from '../../models/order/order';
import * as dateFns from 'date-fns';
import { IProduct } from '../../models/seller/product';
import { IAreas } from '../../models/locations/goodAreas';
import { getResults } from '../../helpers/query';
import { ISeller } from '../../models/customer/seller';
import { throwError } from '../../helpers/throw-errors';
import { riderCarryMaxCash } from '../rider/rider';
import { IPenalty } from '../../models/general/penalty';
import axios from 'axios';
import config from '../../../config.json';
import { Whatsapp } from '../../models/whatsapp/whatsappMessage';
import { IRider } from '../../models/rider/rider';
const GoodAreas = model<IAreas>('Areas');

const Notification = model<INotification>('Notification');
const Customer = model<ICustomer>('Customer');
const Order = model<IOrder>('Order');
const GroupOrder = model<IGroupOrder>('GroupOrder');
const NewProduct = model<IProduct>('NewProduct');
const Seller = model<ISeller>('NewCustomer');
const Penalty = model<IPenalty>('Penalty');
const Rider = model<IRider>('Rider');
const ObjectId = Types.ObjectId;
const orderAnalytics = async (start: Date, end: Date, intervalTime: number) => {
	let orderOverTimeInterval = [];
	let interval = intervalTime;
	let intervalEnd = new Date();
	intervalEnd.setTime(2.5 * 60 * 60 * 1000);

	const orderData = await Order.find({
		createdAt: {
			$gte: start,
			$lte: end
		},
		'delivered.status': true,
		'returned.status': false
	});

	for (var i = 0; interval == 0.5 ? i <= 12 / interval : i <= 12 * interval; i++) {
		let filterData = [];
		let intervalStart = intervalEnd.toTimeString().slice(0, 8);
		intervalEnd.setTime(intervalEnd.getTime() + 60 * 60 * 1000 * interval);
		orderData.forEach((order) => {
			if (
				order.createdAt.toTimeString().slice(0, 8) >= intervalStart &&
				order.createdAt.toTimeString().slice(0, 8) <= intervalEnd.toTimeString().slice(0, 8)
			) {
				filterData.push(order);
			}
		});

		if (filterData.length == 0) {
			orderOverTimeInterval.push({
				orderCount: 0,
				startTime: intervalStart,
				endTime: intervalEnd.toTimeString().slice(0, 8),
				data: filterData
			});
		} else {
			orderOverTimeInterval.push({
				orderCount: filterData.length,
				startTime: intervalStart,
				endTime: intervalEnd.toTimeString().slice(0, 8),
				data: filterData
			});
		}
	}
	return orderOverTimeInterval;
};

export const getDashboard = async (queryObj: QueryObj, user) => {
	try {
		const unreadNoti = await Notification.find({
			userType: 'admin',
			user: user._id,
			clear: false
		}).countDocuments();
		const sellerApprovals = await Seller.find({
			approved: false,
			kyc: true
		}).countDocuments();
		const returnRequests = await Order.find({
			'currentStatus.status': 'return_requested'
		}).countDocuments();
		const ordersToDispatch = await Order.find({
			'currentStatus.status': 'dispatch'
		}).countDocuments();

		const startDate = queryObj.startDate
			? new Date(queryObj.startDate)
			: dateFns.startOfDay(new Date());
		const endDate = queryObj.endDate
			? new Date(queryObj.endDate)
			: dateFns.endOfDay(new Date());

		const newOrders = await Order.find({
			createdAt: { $gte: startDate, $lt: endDate }
		}).countDocuments();

		const isProcessing = await Order.find({
			createdAt: { $gte: startDate, $lt: endDate },
			'accepted.status': true,
			'delivered.status': false,
			'cancelled.status': false,
			'returned.status': false
		}).countDocuments();
		const delivered = await Order.find({
			createdAt: { $gte: startDate, $lt: endDate },
			'delivered.status': true,
			'returned.status': false
		}).countDocuments();
		const cancelled = await Order.find({
			createdAt: { $gte: startDate, $lt: endDate },
			'cancelled.status': true
		}).countDocuments();
		const rejected = await Order.find({
			createdAt: { $gte: startDate, $lt: endDate },
			'rejected.status': true
		}).countDocuments();
		const failed = await Order.find({
			createdAt: { $gte: startDate, $lt: endDate },
			'currentStatus.status': 'failed'
		}).countDocuments();
		const partialAccepted = await Order.find({
			createdAt: { $gte: startDate, $lt: endDate },
			$expr: { $gt: [{ $size: '$rejectedItems' }, 0] }
		}).countDocuments();
		const returned = await Order.find({
			createdAt: { $gte: startDate, $lt: endDate },
			'returned.status': true
		}).countDocuments();

		const uniqueBuyers = await Order.distinct('buyer', {
			createdAt: { $gte: startDate, $lt: endDate },
			'delivered.status': true
		});
		const uniqueBuyerCount = uniqueBuyers.length;

		const orderOverTimeInterval = await orderAnalytics(
			queryObj.startDate,
			queryObj.endDate,
			queryObj.interval
		);

		const totalAmt = await Order.aggregate([
			{
				$match: {
					createdAt: { $gte: startDate, $lt: endDate },
					'statusHistory.status': 'delivered'
				}
			},
			{
				$group: {
					_id: 1,
					total: { $sum: '$order.totalAmt' }
				}
			}
		]);
		const commission = await Order.aggregate([
			{
				$match: {
					createdAt: { $gte: startDate, $lt: endDate },
					'statusHistory.status': 'delivered'
				}
			},
			{
				$group: {
					_id: 1,
					total: { $sum: '$commission.totalAmt' }
				}
			}
		]);

		const refundAmt = await Order.aggregate([
			{
				$match: {
					createdAt: { $gte: startDate, $lt: endDate },
					'statusHistory.status': 'placed'
				}
			},
			{
				$group: {
					_id: 1,
					total: { $sum: '$refund.amount' }
				}
			}
		]);

		const totalWalletRewardBalance = await Customer.aggregate([
			{
				$group: {
					_id: 1,
					totalWallet: { $sum: '$balance' },
					totalReward: { $sum: '$rewardBalance' }
				}
			}
		]);

		const totalWalletBalanceUsed = await Order.aggregate([
			{
				$match: {
					createdAt: { $gte: startDate, $lt: endDate },
					'delivered.status': true
				}
			},
			{
				$group: {
					_id: 1,
					totalWalletUsed: { $sum: '$walletUse' },
					totalRewardUsed: { $sum: '$rewardUse' }
				}
			}
		]);

		const totalUsers =
			(await Customer.find({
				createdAt: { $lt: endDate }
			}).countDocuments()) +
			(await Seller.find({ createdAt: { $lt: endDate } }).countDocuments());
		const registeredUsers =
			(await Customer.find({
				createdAt: { $lt: endDate }
			}).countDocuments()) +
			(await Seller.find({ createdAt: { $lt: endDate } }).countDocuments());
		const sellers = await Seller.find({
			createdAt: { $lt: endDate },
			kyc: true
		}).countDocuments();
		const buyers = await Customer.find({
			createdAt: { $lt: endDate }
		}).countDocuments();
		const blockedUsers =
			(await Customer.find({
				createdAt: { $lt: endDate },
				status: 'inactive'
			}).countDocuments()) +
			(await Seller.find({
				createdAt: { $lt: endDate },
				status: 'inactive'
			}).countDocuments());
		const products = await NewProduct.find({
			createdAt: { $lt: endDate }
		}).countDocuments();
		const activeProducts = await NewProduct.find({
			createdAt: { $lt: endDate },
			status: 'active'
		}).countDocuments();
		const disabledProducts = await NewProduct.find({
			createdAt: { $lt: endDate },
			status: 'inactive'
		}).countDocuments();
		const deletededProducts = await NewProduct.find({
			createdAt: { $lt: endDate },
			status: 'deleted'
		}).countDocuments();

		return [
			{
				title: 'Actions Required',
				counts: [
					{ title: 'Unread Notifications', value: unreadNoti },
					{ title: 'Seller Approvals', value: sellerApprovals },
					{ title: 'Return Requests', value: returnRequests },
					{ title: 'Orders to Dispatch', value: ordersToDispatch }
				]
			},
			{
				title: 'Orders',
				counts: [
					{ title: 'New Orders', value: newOrders },
					{ title: 'In Processing', value: isProcessing },
					{ title: 'Delivered', value: delivered },
					{ title: 'Cancelled', value: cancelled },
					{ title: 'Rejected', value: rejected },
					{ title: 'Payment Failure', value: failed },
					{ title: 'Partial Accepted', value: partialAccepted },
					{ title: 'Returned', value: returned },
					{ title: 'Unique Buyers', value: uniqueBuyerCount }
				]
			},
			{
				title: 'Transactions',
				counts: [
					{ title: 'Total Amt', value: totalAmt[0]?.total || 0 },
					{ title: 'Commission Amt', value: commission[0]?.total || 0 },

					{ title: 'Refund Amt', value: refundAmt[0]?.total || 0 },
					{ title: 'Wallet Amt', value: totalWalletRewardBalance[0]?.totalWallet || 0 },
					{ title: 'Reward Amt', value: totalWalletRewardBalance[0]?.totalReward || 0 },
					{
						title: 'Wallet Used',
						value: totalWalletBalanceUsed[0]?.totalWalletUsed || 0
					},
					{ title: 'Reward Used', value: totalWalletBalanceUsed[0]?.totalRewardUsed || 0 }
				]
			},
			{
				title: 'Strength',
				counts: [
					{ title: 'Total Users', value: totalUsers },
					{ title: 'Registered Users', value: registeredUsers },
					{ title: 'Sellers', value: sellers },
					{ title: 'Buyers', value: buyers },
					{ title: 'Blocked Users', value: blockedUsers },
					{ title: 'Total Products', value: products },
					{ title: 'Active Products', value: activeProducts },
					{ title: 'Disabled Products', value: disabledProducts },
					{ title: 'Deleted Products', value: deletededProducts }
				]
			},
			{
				title: 'Order Analytics',
				counts: [],
				orderAnalytics: [{ title: 'Order Analytics', value: orderOverTimeInterval }]
			}
		];
	} catch (error) {
		throw error;
	}
};
export const createGoodArea = async (data) => {
	/*
     accepted body format 
     {
	loc: {
		type: {
			type: String,
			enum: ['Polygon'],
			required: true,
			default: 'Polygon'
		},
		coordinates: {
			type: [[[Number]]], // Array of arrays of arrays of numbers
			required: true
		}
	},
    name:{
        type:String,
        require:true
    },
    city:{
        type:String,
        require:true
    },
    state:{
        type:String,
        require:true
    },
    pincode:{
        type:Number,
        require:true
    }
 
*/
	try {
		let { loc, name, city, state, pincode, deliveryFee, abnormalDeliveryFee } = data;
		let alreadyExist = await GoodAreas.findOne({ loc: loc, pincode: pincode });
		if (!alreadyExist) {
			let createArea = await new GoodAreas({
				loc,
				name,
				city,
				state,
				pincode,
				deliveryFee,
				abnormalDeliveryFee
			});
			await createArea.save();
			return createArea;
		} else {
			alreadyExist.name = name;
			alreadyExist.city = city;
			alreadyExist.state = state;
			await alreadyExist.save();
			return alreadyExist;
		}
	} catch (error) {
		throw error;
	}
};

export const removeGoodAreaById = async (id) => {
	try {
		await GoodAreas.deleteOne({ _id: id });
		return;
	} catch (error) {
		throw error;
	}
};

export const getGoodAreas = async (QueryObj) => {
	try {
		let { search, sort, order } = QueryObj;

		let result = await GoodAreas.find({});
		return result;
	} catch (error) {
		throw error;
	}
};

export const getAreaByPincode = async (pincode) => {
	try {
		let areasByPincode = GoodAreas.find({ pincode: pincode });
		return areasByPincode;
	} catch (error) {
		throw error;
	}
};

//admin panel return reject order details
export const getReturnRequests = async (data: any) => {
	try {
		let { startDate, endDate, filter } = data;
		let query;
		if (!startDate || !endDate) {
			query = {};
		} else {
			startDate = dateFns.startOfDay(new Date(startDate));
			endDate = dateFns.endOfDay(new Date(endDate));
			query = {
				'returnRequest.created.date': {
					$gte: startDate,
					$lte: endDate
				}
			};
		}
		let filters = {};
		if (filter) {
			if (filter == 'Pending') {
				filters = {
					'returnRequest.created.status': true,
					'returnRequest.rejected.status': false,
					'returnRequest.approved.status': false
				};
			}
		}

		if (filter == 'Accepted') {
			filters = {
				'returnRequest.created.status': true,
				'returnRequest.rejected.status': false,
				'returnRequest.approved.status': true
			};
		}
		if (filter == 'Rejected') {
			filters = {
				'returnRequest.created.status': true,
				'returnRequest.rejected.status': true,
				'returnRequest.approved.status': false
			};
		}

		let return_requests = await Order.find({ ...query, ...filters })
			.sort({ createdAt: -1 })
			.populate('rider', 'name contact');

		return return_requests;
	} catch (err) {
		throwError(500);
	}
};

//admin action page fetching the data by order id
export const getOrderRequestDetail = async (data: any) => {
	try {
		let order = await Order.findById(data)
			.populate('rider', { name: 1, floatingCash: 1, contact: 1 })
			.lean();
		if (!order) {
			throwError(501);
		}

		let customer = await Customer.findById(order?.buyer)
			.select('codBlock orderCount name contact')
			.lean();

		return {
			order,
			customer
		};
	} catch (err) {
		throwError(500);
	}
};

//admin action page imposing penalty (action page)
export const penalty = async (data: any, user: any) => {
	try {
		let { userType, userId, amount, remark, orderId } = data;

		let newPenalty = new Penalty({
			userType,
			userId,
			amount,
			remark,
			orderId,
			imposedBy: user._id
		});
		await newPenalty.save();
		return newPenalty;
	} catch (error) {
		throwError(500);
	}
};

// admin panel customer cod block (action page)
export const codBlock = async (data: any, user: any) => {
	try {
		let { customerID, codNumber, codRemark } = data;
		let customer: any = await Customer.findById(customerID);
		customer.codBlock = codNumber;
		await customer.save();
	} catch (error) {
		throwError(500);
	}
};
export const buyerRefund = async (data: any, user: any) => {
	try {
		let { orderId, refundAmount } = data;
		let order: any = await Order.findById(orderId);
		order.refund.amount = refundAmount;
		await order.save();
	} catch (error) {
		throwError(500);
	}
};

export const sendWhatsAppMessage = async (data, user) => {
	const headers = {
		Authorization: `Bearer ${config.whatsappApiToken}`,
		'Content-Type': 'application/json'
	};
	let customerRecievedMessage = [];
	let x;
	if (data.template.name === 'new_install_location_issue') {
		let customers = await Customer.find({}).skip(139).limit(500);

		for (const customer of customers) {
			const requestData = {
				messaging_product: 'whatsapp',
				recipient_type: 'individual',
				to: customer?.contact,
				type: 'template',
				template: {
					name: data.template.name,
					language: {
						code: data.template.language
					},
					components: [
						{
							type: 'header',
							parameters: [
								{
									type: 'image',
									image: {
										link: 'https://i.imgur.com/rjWveHR.jpg'
									}
								}
							]
						},
						{
							type: 'body',
							parameters: [
								{
									type: 'text',
									text: 'Vada Pav'
								},
								{
									type: 'text',
									text: 'Rs49 (Additional Flat Rs40 Off)'
								},
								{
									type: 'text',
									text: 'Vada Pav'
								},
								{
									type: 'text',
									text: '*Thikana (Food Joint)*'
								},
								{
									type: 'text',
									text: 'better than shop rates at home (Use Code THIKANA)'
								},
								{
									type: 'text',
									text: 'SOON'
								}
							]
						},
						{
							type: 'button',
							sub_type: 'url',
							index: '0',
							parameters: [
								{
									type: 'text',
									text: '6322cc868a52a9ecdc1c7809'
								}
							]
						}
					]
				}
			};

			try {
				const response = await axios.post(
					'https://graph.facebook.com/v17.0/101557882761538/messages',
					requestData,
					{ headers }
				);

				// x = await Customer.updateOne(
				// 	{ _id: customer._id },
				// 	{
				// 		$inc: { 'whatsAppSmsCount.marketing': 1 },
				// 		$set: {
				// 			'whatsAppSmsCount.updatedTime': new Date(),
				// 			'whatsAppSmsCount.lastTemplateType': 'marketing' // or 'utility'
				// 		}
				// 	},
				// 	{ upsert: true }
				// );

				customerRecievedMessage.push(customer);
			} catch (error) {
				console.error('Error sending message:', error.response.data);
			}
		}
	}

	return { status: 'Success', customerRecievedMessage };
};

export const filterBuyer = async (data, user) => {
	let buyers;
	const orderCount = data.delivery || 2; // Use the orderCount specified in data or default to 2.

	try {
		if (data.filter === 'createdAt') {
			const startDate = new Date(data.date.startDate);
			const endDate = data.date.endDate ? new Date(data.date.endDate) : new Date();
			buyers = await Customer.find({
				createdAt: { $gte: startDate, $lte: endDate },
				DND: false
			});
		} else if (data.filter === 'orderCount') {
			buyers = await Customer.find({
				'orderCount.delivery': { $gte: data.delivery },
				DND: false
			});
		} else if (data.filter === 'deliveredOrders') {
			buyers = await Customer.aggregate([
				{
					$match: {
						createdAt: {
							$gte: new Date(data.date.startDate),
							$lte: data.date.endDate ? new Date(data.date.endDate) : new Date()
						},
						DND: false
					}
				},
				{
					$lookup: {
						from: 'orders',
						let: { buyerId: '$_id' },
						pipeline: [
							{
								$match: {
									$expr: { $eq: ['$buyer', '$$buyerId'] },
									'currentStatus.status': 'delivered'
								}
							}
						],
						as: 'orders'
					}
				},
				{
					$match: {
						[`orders.${orderCount - 1}`]: { $exists: true }
					}
				}
			]);
		} else if (data.filter === 'area') {
			const area: any = await GoodAreas.findOne({ _id: data.areaId });
			if (!area) {
				throw new Error(`Area not found with _id ${data.areaId}`);
			}

			buyers = await Customer.find({
				latestLocation: {
					$geoWithin: {
						$geometry: area.loc
					}
				},
				DND: false
			});
		} else {
			buyers = await Customer.find({ DND: false });
		}

		return { status: 'success', buyers: buyers }; // Return the list of buyers in the response.
	} catch (error) {
		console.error('Error finding buyers:', error);
		return { status: 'error', message: 'An error occurred while finding buyers.' };
	}
};

export const sendWhatsAppMessageFinal = async (data, user) => {
	const orderCount = +data.filterCustomerData.delivery || 2; // Use the orderCount specified in data or default to 2.
	let buyers;
	if (data.filterCustomerData) {
		if (data.filterCustomerData.filter === 'createdAt') {
			const startDate = new Date(data.filterCustomerData.date.startDate);
			const endDate = data.filterCustomerData.date.endDate
				? new Date(data.filterCustomerData.date.endDate)
				: new Date();
			buyers = await Customer.find({
				createdAt: { $gte: startDate, $lte: endDate },
				DND: false
			});
		} else if (data.filterCustomerData.filter === 'orderCount') {
			buyers = await Customer.find({
				'orderCount.delivery': { $gte: data.filterCustomerData.delivery },
				DND: false
			});
		} else if (data.filterCustomerData.filter === 'deliveredOrders') {
			const startDate = new Date(data.filterCustomerData.date.startDate);
			const endDate = data.filterCustomerData.date.endDate
				? new Date(data.filterCustomerData.date.endDate)
				: new Date();
			buyers = await Customer.aggregate([
				{
					$match: {
						createdAt: {
							$gte: startDate,
							$lte: endDate
						},
						DND: false
					}
				},
				{
					$lookup: {
						from: 'orders',
						let: { buyerId: '$_id' },
						pipeline: [
							{
								$match: {
									$expr: { $eq: ['$buyer', '$$buyerId'] },
									'currentStatus.status': 'delivered'
								}
							}
						],
						as: 'orders'
					}
				},
				{
					$match: {
						[`orders.${orderCount - 1}`]: { $exists: true }
					}
				}
			]);
		} else if (data.filterCustomerData.filter === 'area') {
			const area: any = await GoodAreas.findOne({ _id: data.filterCustomerData.areaId });
			if (!area) {
				throw new Error(`Area not found with _id ${data.filterCustomerData.areaId}`);
			}

			buyers = await Customer.find({
				latestLocation: {
					$geoWithin: {
						$geometry: area.loc
					}
				},
				DND: false
			});
		} else {
			buyers = await Customer.find({ DND: false });
		}
	}
	const headers = {
		Authorization: `Bearer ${config.whatsappApiToken}`,
		'Content-Type': 'application/json'
	};
	let customerRecievedMessage = [];
	for (const customer of buyers) {
		const requestData = {
			messaging_product: 'whatsapp',
			recipient_type: 'individual',
			to: customer?.contact,
			type: 'template',
			template: {
				name: data.templateName,
				language: {
					code: data.templateLanguage
				},
				components: data.components
			}
		};
		try {
			const response: any = await axios.post(
				'https://graph.facebook.com/v17.0/101557882761538/messages',
				requestData,
				{ headers }
			);

			let updateObject = {
				'whatsAppSmsCount.updatedTime': new Date(),
				'whatsAppSmsCount.lastTemplateType': 'utility'
			};

			if (data.templateCategory === 'MARKETING') {
				updateObject['whatsAppSmsCount.marketing'] =
					customer.whatsAppSmsCount.marketing + 1;
				updateObject['whatsAppSmsCount.lastTemplateType'] = data.templateName;
			} else {
				updateObject['whatsAppSmsCount.utility'] = customer.whatsAppSmsCount.utility + 1;
				updateObject['whatsAppSmsCount.lastTemplateType'] = data.templateName;
			}

			await Customer.updateOne(
				{ _id: customer._id },
				{
					$set: updateObject
				},
				{ upsert: true }
			);

			const existingWhatsappCustomer = await Whatsapp.findOne({ contact: customer?.contact });
			if (existingWhatsappCustomer) {
				const newMessage: any = {
					reply:
						data.templateName +
						'  message :-  ' +
						JSON.stringify(data.components, null, 2),
					sentTime: new Date()
				};

				if (response.status == '200') {
					existingWhatsappCustomer.message.push(newMessage);
					await existingWhatsappCustomer.save();
				}
			}
			customerRecievedMessage.push(customer);
		} catch (error) {
			console.error('Error sending message:', error);
		}
	}
	return { status: 'Success', customerRecievedMessage };
};

//update customer DND whatsapp
export const updateCustomerDND = async (id: string, status: boolean, user) => {
	try {
		if (!user._id) {
			throwError(405);
		}

		await Customer.updateOne(
			{
				_id: ObjectId(id)
			},
			{
				$set: {
					DND: status
				}
			}
		);

		return;
	} catch (err) {
		throwError(404);
	}
};

export const getSellerWithPositions = async (parentCategory) => {
	try {
		let sellers = await Seller.find({ parentCategory: parentCategory })
			.sort({ position: 1 })
			.select({ businessName: 1, position: 1 })
			.limit(30);
		return sellers;
	} catch (error) {
		console.log(error);
	}
};

export const changeSellerPosition = async (data) => {
	try {
		let { seller, position } = data;
		let updateSeller = await Seller.updateOne(
			{ _id: seller },
			{
				$set: {
					position: position
				}
			}
		);
		let sellers = await Seller.find({})
			.sort({ position: 1 })
			.select({ businessName: 1, position: 1 })
			.limit(20);
		return sellers;
	} catch (error) {
		console.error(error);
	}
};

export const clearRiderSessions = async (id) => {
	try {
		let riderUpdate = await Rider.updateOne(
			{ _id: id },
			{
				$set: {
					sessions: []
				}
			}
		);
		return riderUpdate;
	} catch (error) {
		console.error(error);
	}
};
