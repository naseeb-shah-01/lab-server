import axios from 'axios';
import config from '../../../config.json';
import { model } from 'mongoose';
import { IScheduleMessage } from '../../models/whatsapp/scheduleMessage';
import CustomerModel, { ICustomer } from '../../models/customer/customer';
import { IAreas } from '../../models/locations/goodAreas';
import { Whatsapp } from '../../models/whatsapp/whatsappMessage';
import { throwError } from '../../helpers/throw-errors';
import { QueryObj } from '../../middlewares/query';
import { getResults } from '../../helpers/query';

const ScheduledMessage = model<IScheduleMessage>('Whatsapp_msg_queue');
const Customer = model<ICustomer>('Customer');
const GoodAreas = model<IAreas>('Areas');

//headers to be passed in each whatsapp api request
const headers = {
	Authorization: `Bearer ${config.whatsappApiToken}`,
	'Content-Type': 'application/json'
};

//for testing in a single number
export const sendTestMessage = async (data: any) => {
	if (!data) {
		throw new Error('Data is required');
	}

	try {
		const response: any = await axios.post(
			'https://graph.facebook.com/v17.0/101557882761538/messages',
			data,
			{ headers }
		);

		if (response.status != 200) {
			throw new Error(`Unexpected status code: ${response.status}`);
		}

		return { data: response.data };
	} catch (error) {
		console.error('Error sending message:', error.message);
		throw new Error(error.message);
	}
};

export const saveScheduledMessage = async (data: any) => {
	// Create a new document
	const scheduledMessage = new ScheduledMessage(data);

	await scheduledMessage.save();

	return scheduledMessage;
};

export const sendScheduledWhatsAppMessage = async (messageData: any) => {
	try {
		if (!messageData) {
			return;
		}
		let {
			status,
			sendStatus,
			messageType,
			testNumber,
			template,
			filterCustomer,
			messaging_product,
			recipient_type,
			type
		} = messageData;

		if (status === 'inactive') {
			return;
		}

		if (template) {
			template = template.toObject(); // Convert to a regular object
			removeId(template);
		}

		if (sendStatus === 'pending' && messageType === 'test') {
			const requestData = {
				messaging_product,
				recipient_type,
				type,
				to: testNumber,
				template
			};

			try {
				const response: any = await axios.post(
					'https://graph.facebook.com/v17.0/101557882761538/messages',
					requestData,
					{ headers }
				);
				let sentMsgCount: any;
				if (response.status != 200) {
					throw new Error(`Unexpected status code: ${response.status}`);
				}
				sentMsgCount = 1;

				return sentMsgCount;
			} catch (error) {
				console.error('Error sending test message:', error.message);
				throw new Error(error.message);
			}
		}

		if (sendStatus === 'pending' && messageType === 'final') {
			const requestData = {
				messaging_product,
				recipient_type,
				type,
				template
			};
			if (filterCustomer) {
				const { filterBy, dateRange, deliveredOrders, area, foodOrders } = filterCustomer;
				const buyerList = await filterCustomerByCriteria(
					filterBy,
					dateRange,
					foodOrders,
					deliveredOrders,
					area
				);
				let sentMsgCount = 0;
				if (buyerList.length > 0) {
					sentMsgCount = await buyerListAndSendWhatsappMsg(buyerList, requestData);

					return sentMsgCount;
				} else {
					return sentMsgCount;
				}
			}
		}
	} catch (error) {
		console.error('Error in message:', error.message);
		throw new Error(error);
	}
};

//helper function to remove _id
function removeId(obj) {
	for (let prop in obj) {
		if (prop === '_id') {
			delete obj[prop];
		} else if (typeof obj[prop] === 'object') {
			removeId(obj[prop]);
		}
	}
}

//helper function to find all the filter customer
export const filterCustomerByCriteria = async (
	filterBy: String,
	dateRange: any,
	foodOrders: any,
	deliveredOrders,
	area: String
) => {
	let startingDate: Date;
	let endingDate: Date;
	if (dateRange) {
		const { startDate, endDate } = dateRange;
		startingDate = startDate;
		endingDate = endDate;
	}
	if (filterBy === 'createdAt') {
		const buyers = await Customer.find({
			createdAt: { $gte: new Date(startingDate), $lte: new Date(endingDate) },
			DND: false
		});
		return buyers;
	} else if (filterBy === 'deliveredOrders') {
		const buyers = await Customer.aggregate([
			{
				$match: {
					createdAt: {
						$gte: new Date(startingDate),
						$lte: new Date(endingDate)
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
					[`orders.${+deliveredOrders - 1}`]: { $exists: true }
				}
			}
		]);
		return buyers;
	} else if (filterBy === 'area') {
		const goodArea: any = await GoodAreas.findOne({ _id: area });
		const buyers = await Customer.find({
			latestLocation: {
				$geoWithin: {
					$geometry: goodArea.loc
				}
			},
			DND: false
		});
		return buyers;
	} else if (filterBy === 'foodOrders') {
		const buyers = await Customer.aggregate([
			{
				$lookup: {
					from: 'orders',
					localField: '_id',
					foreignField: 'buyer',
					as: 'orders'
				}
			},
			{ $unwind: '$orders' },
			{
				$match: {
					'orders.commission.restaurantGst': { $gt: 0 },
					DND: false
				}
			}
		]);

		return buyers;
	}
};

export const buyerListAndSendWhatsappMsg = async (buyerList: any, requestData: any) => {
	const bulkOps = [];
	const whatsappBulkOps = [];
	for (const buyer of buyerList) {
		requestData.to = buyer.contact;

		try {
			const response: any = await axios.post(
				'https://graph.facebook.com/v17.0/101557882761538/messages',
				requestData,
				{ headers }
			);

			if (response.status == '200') {
				let updateObject = {
					'whatsAppSmsCount.updatedTime': new Date(),
					'whatsAppSmsCount.marketing': buyer.whatsAppSmsCount.marketing + 1,
					'whatsAppSmsCount.lastTemplateType': requestData.template.name
				};

				bulkOps.push({
					updateOne: {
						filter: { _id: buyer._id },
						update: { $set: updateObject },
						upsert: true
					}
				});

				const newMessage = {
					reply: `${requestData.template.name} message :- ${JSON.stringify(
						requestData.template.components,
						null,
						2
					)}`,
					sentTime: new Date()
				};

				whatsappBulkOps.push({
					updateOne: {
						filter: { contact: buyer.contact },
						update: { $push: { message: newMessage } },
						upsert: true
					}
				});
			}
		} catch (err) {
			console.error(err.message);
		}
	}

	if (bulkOps.length > 0) {
		await Customer.bulkWrite(bulkOps);
		return bulkOps.length;
	}

	if (whatsappBulkOps.length > 0) {
		await Whatsapp.bulkWrite(whatsappBulkOps);
	}
};

export const getAllScheduleMsg = async (queryObj: QueryObj) => {
	try {
		const dbQuery: any = {};

		const dbProject: any = {};

		const results = await getResults(
			queryObj,
			ScheduledMessage,
			dbQuery,
			dbProject,
			'name',
			'name',
			1,
			15
		);

		return results;
	} catch (error) {
		throw error;
	}
};
export const updateStatus = async (id: string, status: string) => {
	try {
		let update = await ScheduledMessage.updateOne(
			{
				_id: id
			},
			{
				$set: {
					status: status
				}
			}
		);
		return;
	} catch (err) {
		throwError(err);
	}
};

export const messageDetails = async (id: string) => {
	try {
		let msg = await ScheduledMessage.findOne({
			_id: id
		}).lean();

		if (!msg) {
			throwError(400);
		}

		return msg;
	} catch (error) {
		throwError(401);
	}
};

export const updateScheduleMsg = async (data: any) => {
	try {
		let update = await ScheduledMessage.updateOne(
			{
				_id: data._id
			},
			{
				$set: data
			}
		);
		return update;
	} catch (error) {
		throwError(500);
	}
};
