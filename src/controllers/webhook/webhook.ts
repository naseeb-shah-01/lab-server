import { model } from 'mongoose';
import { ICustomer } from '../../models/customer/customer';
import { IWhatsapp, Whatsapp } from '../../models/whatsapp/whatsappMessage';
import { QueryObj } from '../../middlewares/query';
import { getResults } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { ISeller } from '../../models/customer/seller';
import axios from 'axios';
import config from '../../../config.json';
import { IOrder } from '../../models/order/order';
import { sendEmail } from '../../helpers/mailer';
import { calculateDistance, getDistanceWithGoogle } from '../../helpers/calculateDistance';
import { convert_time, extractTimeFromString, reverseConvertTime } from '../customers/order';
import { addMinutes } from 'date-fns';
import { tf0 } from '../../helpers/number';
import { recommender } from 'googleapis/build/src/apis/recommender';
import { sendNewWhatsappMessageToDiscord } from '../discord/discord_webhook';

const WhatsApp = model<IWhatsapp>('Whatsapp');
const Customer = model<ICustomer>('Customer');
const Seller = model<ISeller>('NewCustomer');
const Order = model<IOrder>('Order');

//to verify the callback url from dashboard side - cloud api side
const mytoken = 'ashar';

const headers = {
	Authorization: `Bearer ${config.whatsappApiToken}`,
	'Content-Type': 'application/json'
};
export const verifyCallBackUrl = async (req, res) => {
	let mode = req.query['hub.mode'];
	let challange = req.query['hub.challenge'];
	let token = req.query['hub.verify_token'];

	if (mode && token) {
		if (mode === 'subscribe' && token === mytoken) {
			res.status(200).send(challange);
		} else {
			res.status(403);
		}
	}
};

async function checkForNewMessages(contact) {
	let existingWhatsappCustomer = await Whatsapp.findOne({ contact: contact });
	if (existingWhatsappCustomer && existingWhatsappCustomer.message.length > 0) {
		let previousMessageCount = existingWhatsappCustomer.message.length;
		existingWhatsappCustomer = await Whatsapp.findOne({ contact: contact });

		if (existingWhatsappCustomer.message.length > previousMessageCount) {
			return true;
		}
	}

	return false;
}

export const storeWhatsappMessages = async (req, res) => {
	try {
		const body_param = req.body;
		if (!body_param.object) {
			return; // No  object return
		}

		const entry = body_param.entry?.[0];
		if (!entry) {
			return; // No  entry return
		}

		const changes = entry.changes?.[0].value;
		if (!changes) {
			return; // No changes return
		}

		const statuses = changes.statuses?.[0];
		const messages = changes.messages?.[0];

		if (statuses) {
			const { recipient_id, id, status, timestamp } = statuses;
			const recipientContact = recipient_id.replace('91', '');

			let customer: any = await Customer.findOne({ contact: recipientContact });
			let seller: any = await Seller.findOne({ contact: recipientContact });
			if (!customer) {
				return; // Customer not found return
			}

			let existingWhatsappCustomer = await Whatsapp.findOne({ contact: recipientContact });
			const updateData: any = {
				customerId: customer._id,
				templateName: customer.whatsAppSmsCount.lastTemplateType,
				smsStatus: status,
				messageId: id
			};

			if (status === 'sent') {
				updateData.sentTime = new Date(parseInt(timestamp) * 1000);
				updateData.deliveredTime = null;
				updateData.readTime = null;
				customer.whatsAppSmsCount.sendTime = new Date(parseInt(timestamp) * 1000);
				await updateCustomerWhatsAppCount(customer, status);
				await updateSellerWhatsAppCount(seller, status);
			} else if (status === 'delivered') {
				updateData.deliveredTime = new Date(parseInt(timestamp) * 1000);
				updateData.readTime = null;
				// Update deliveredTime in Customer model
				customer.whatsAppSmsCount.deliveredTime = new Date(parseInt(timestamp) * 1000);
				customer.whatsAppSmsCount.readTime = null;
				await updateCustomerWhatsAppCount(customer, status);
				await updateSellerWhatsAppCount(seller, status);
			} else if (status === 'read') {
				updateData.readTime = new Date(parseInt(timestamp) * 1000);
				// Update readTime in Customer model

				customer.whatsAppSmsCount.readTime = new Date(parseInt(timestamp) * 1000);
				await updateCustomerWhatsAppCount(customer, status);
				await updateSellerWhatsAppCount(seller, status);
			}

			if (!existingWhatsappCustomer) {
				await Whatsapp.create({
					contact: customer.contact,
					name: customer.name,
					...updateData
				});
			} else {
				await Whatsapp.updateOne({ contact: recipientContact }, { $set: updateData });
			}
		} else if (messages) {
			const { from, timestamp, text } = messages;
			const recipientContact = from.replace('91', '');
			let customer = await Customer.findOne({ contact: recipientContact });
			let existingWhatsappCustomer = await Whatsapp.findOne({ contact: recipientContact });
			if (!existingWhatsappCustomer) {
				const createData: any = {
					customerId: customer._id,
					templateName: '',
					smsStatus: '',
					messageId: '',
					message: [],
					sentTime: null,
					deliveredTime: null,
					readTime: null,
					unread: true,
					open: true,
					agent: '',
					openTime: new Date(),
					closedTime: null,
					pastIssues: []
				};

				createData.message.push({
					chat: text.body,
					receivedTime: new Date(parseInt(timestamp) * 1000)
				});
				await Whatsapp.create({
					contact: customer.contact,
					name: customer.name,
					...createData
				});
			} else {
				existingWhatsappCustomer.message.push({
					chat: text.body,
					receivedTime: new Date(parseInt(timestamp) * 1000)
				});
				existingWhatsappCustomer.unread = true;
				existingWhatsappCustomer.open = true;
				existingWhatsappCustomer.openTime = new Date();
				existingWhatsappCustomer.closedTime = null;
				existingWhatsappCustomer.pastIssues = [...existingWhatsappCustomer.pastIssues];

				await Whatsapp.updateOne(
					{ contact: recipientContact },
					{ $set: existingWhatsappCustomer }
				);

				await sendOrderUpdateWhatsappMsg(existingWhatsappCustomer);
			}

			//test
			if (recipientContact === '7001058374') {
				return;
			}
			//email notification
			if (text?.body) {
				for (let to of config?.email?.admin?.to) {
					try {
						await sendEmail({
							to: to,
							subject: `New Whatsapp Message From ${recipientContact}`,
							text: `Message : ${text?.body}`
						});
					} catch (error) {
						console.error(error);
					}
				}
				sendNewWhatsappMessageToDiscord(recipientContact, text.body);
			}
		}
	} catch (error) {
		console.error(error);
	}
};

export const updateCustomerWhatsAppCount = async (customer, status) => {
	if (customer) {
		customer.whatsAppSmsCount.sentCount += status === 'sent' ? 1 : 0;
		customer.whatsAppSmsCount.deliveredCount += status === 'delivered' ? 1 : 0;
		customer.whatsAppSmsCount.readCount += status === 'read' ? 1 : 0;
		await customer.save();
	}
};

async function updateSellerWhatsAppCount(seller, status) {
	if (seller) {
		seller.whatsAppSmsCount.sentCount += status === 'sent' ? 1 : 0;
		seller.whatsAppSmsCount.deliveredCount += status === 'delivered' ? 1 : 0;
		seller.whatsAppSmsCount.readCount += status === 'read' ? 1 : 0;
		await seller.save();
	}
}

// helper function to customize the message based on the order status
async function getOrderStatusMessage(order: any, ETA: any) {
	let messageText = `Hello! Thank you for reaching out.`;
	let perKmTime = config.perKmTime;

	if (
		order.rider &&
		order.rider._id &&
		order.currentStatus.status !== 'placed' &&
		order.currentStatus.status !== 'delivered'
	) {
		let activeOrdersDistance = await calculateDistance(order.rider._id);
		activeOrdersDistance = tf0(activeOrdersDistance * perKmTime);
		ETA = new Date(new Date().getTime() + activeOrdersDistance * 60 * 1000);
	}
	switch (order.currentStatus.status) {
		case 'delivered':
			return `Hello! Thank you for reaching out.\n\nYour order has been *Delivered*.\n\nIf you have any questions or need assistance, feel free to ask. We're here to help.\n\nThank you for choosing us!`;
		case 'placed':
			messageText += `\n\nYour order from *${order.seller.businessName}* has been *Placed*. We're currently processing your order.`;
			messageText += `\nThe estimated arrival time is *approximately ${calculateArrivalTime(
				ETA
			)}*.\n\nIs there anything specific you'd like to know about your order?`;
			return messageText;
		case 'accepted':
			return `Hello! Thank you for reaching out.\n\nOrder ID: #${order._id}\n\nGreat news! Your order has been *Accepted*. We're now processing your order.\n\nFeel free to ask if you have any questions or special requests.`;
		case 'rider_accepted':
			messageText += `\n\nYour order from *${order.seller.businessName}* is on its way. Our rider has *Accepted* the order.`;
			messageText += `\n\nThe estimated arrival time is *approximately ${calculateArrivalTime(
				ETA
			)}*.\n\nDo you need any further assistance with your order?`;
			return messageText;
		case 'ready':
			messageText += `\n\nYour order from *${order.seller.businessName} is now Ready* for pickup. Our rider has *Accepted* the order.`;
			messageText += `\n\nThe estimated arrival time is *approximately ${calculateArrivalTime(
				ETA
			)}*.\n\nDo you need any further assistance with your order?`;
			return messageText;

		case 'dispatch':
			messageText += `\n\nYour order from *${order.seller.businessName} is on the way*. Our rider is en route to your location.`;
			messageText += `\n\nThe estimated arrival time is *approximately ${calculateArrivalTime(
				ETA
			)}*.\n\nDo you need any further assistance with your order?`;
			return messageText;

		case 'arrived':
			return `Hello! Thank you for reaching out.\n\nYour order has *Arrived* at its destination. It's ready for you to enjoy!\n\nIf you have any concerns or need assistance, please don't hesitate to reach out.`;
		case 'rejected':
			return `Hello! Thank you for reaching out.\n\nWe apologize, but there's an issue with your order. It has been *Rejected `;
		case 'failed':
			return `Hello! Thank you for reaching out.\n\nWe apologize, but there's an issue with your order. It has *Failed `;
		default:
			return `Hello! Thank you for reaching out.\n\nYour order (ID: #${order._id}) is currently in *${order.currentStatus.status}*. If you have any questions or need assistance, please feel free to ask. We're here to help.`;
	}
}

function calculateArrivalTime(ETA: any) {
	let now = new Date(ETA);
	const arrivalTime = new Date(now.getTime() + 10 * 60 * 1000);
	const currentHour = now.getHours();
	const arrivalHour = arrivalTime.getHours();
	const currentAMPM = currentHour >= 12 ? 'PM' : 'AM';
	const arrivalAMPM = arrivalHour >= 12 ? 'PM' : 'AM';

	const formattedCurrentMinutes = now.getMinutes().toString().padStart(2, '0');
	const formattedArrivalMinutes = arrivalTime.getMinutes().toString().padStart(2, '0');

	return `${currentHour % 12}:${formattedCurrentMinutes} ${currentAMPM} to ${
		arrivalHour % 12
	}:${formattedArrivalMinutes} ${arrivalAMPM}`;
}
export const sendOrderUpdateWhatsappMsg = async (customer: any) => {
	try {
		const lastMessage = customer.message[customer.message.length - 1];

		// Check if the last message structure matches the expected pattern
		const messagePattern = /Hello, I have an issue with an order\. The order id is #(\d+)/;
		if (!messagePattern.test(lastMessage.chat)) {
			return;
		}

		const messageParts = lastMessage.chat.split('#');
		if (messageParts.length < 2) {
			return;
		}
		const orderId = messageParts[1].trim();

		const order: any = await Order.findOne({ _id: orderId }).populate('rider seller');

		if (!order) {
			return;
		}

		const timeMin = reverseConvertTime(extractTimeFromString(order.deliveryMode.details));
		const ETA = addMinutes(new Date(order.placed.date), +timeMin);

		let messageText = await getOrderStatusMessage(order, ETA);

		if (order?.currentStatus?.remarks && order?.currentStatus?.remarks != 'Ready By Server') {
			messageText += `due to ${order?.currentStatus?.remarks.toUpperCase()}*.\n\nWe're sorry for any inconvenience. Please contact us for further assistance.`;
		}

		// Construct the WhatsApp msg
		const requestData = {
			messaging_product: 'whatsapp',
			to: '91' + customer?.contact,
			text: {
				body: messageText
			}
		};

		const url = `https://graph.facebook.com/v17.0/101557882761538/messages?access_token=${config.whatsappApiToken}`;

		const response = await axios.post(url, requestData, { headers });

		if (response.status !== 200) return;

		const newMessage: any = {
			reply: requestData.text?.body,
			sentTime: new Date()
		};

		customer.message.push(newMessage);
		await customer.save();
	} catch (err) {
		throw err;
	}
};

//all customer list from whatsapp model
export const getAllSmsCustomer = async (queryObj: QueryObj) => {
	try {
		const dbQuery: any = {};

		dbQuery.message = {
			$exists: true,
			$not: { $size: 0 },
			$elemMatch: { chat: { $exists: true } }
		};

		const dbProject: any = {};
		const result = await getResults(
			queryObj,
			WhatsApp,
			dbQuery,
			dbProject,
			'name',
			'name',
			1,
			15
		);

		// Populate the 'customer' key in each item of the 'data' array
		await Promise.all(
			result.data.map(async (item: any) => {
				if (item.customerId) {
					const customerInfo = await Customer.findById(item.customerId);
					item.customer = customerInfo;
				}
			})
		);

		return result;
	} catch (error) {
		throw error;
	}
};
export const getCustomerSmsById = async (id) => {
	let customer;
	try {
		customer = await Whatsapp.findById(id).lean();
	} catch (err) {
		throwError('Error finding Whatsapp by id: ' + err);
	}

	if (customer && customer.customerId) {
		try {
			const customerInfo = await Customer.findById(customer.customerId);
			return { ...customer, customerInfo };
		} catch (err) {
			throwError('Error finding Customer by id: ' + err);
		}
	}

	return customer;
};

export const markCustomerSmsReadById = async (id: string, status: boolean) => {
	try {
		await WhatsApp.updateOne(
			{
				_id: id
			},
			{
				$set: {
					unread: status
				}
			}
		);
	} catch (err) {
		throwError(err);
	}
};

export const sendPersonalMessageWhatsapp = async (data: any) => {
	try {
		const customer = await Whatsapp.findById(data._id);

		if (!customer) {
			throwError(401);
		}

		const newMessage: any = {
			reply: data.reply,
			sentTime: new Date()
		};

		const headers = {
			Authorization: `Bearer ${config.whatsappApiToken}`,
			'Content-Type': 'application/json'
		};

		const requestData = {
			messaging_product: 'whatsapp',
			to: customer.contact,
			text: {
				body: data.reply
			}
		};
		try {
			const response: any = await axios.post(
				'https://graph.facebook.com/v17.0/101557882761538/messages',
				requestData,
				{ headers }
			);

			if (response.status == '200') {
				customer.message.push(newMessage);
				await customer.save();
				return newMessage;
			}
		} catch (error) {
			throwError(error);
		}
	} catch (error) {
		throwError(error);
	}
};

//send order whatsapp msg to seller
export const sendSellerWhatsappSms = async (order: any) => {
	try {
		const seller = order?.seller;
		const { contact, ownerWhatsapp, managerNumber, whatsapp } = seller;
		const orderID = String(order?._id);

		if (!seller) {
			console.error('Seller is missing.');
			return;
		}
		const headers = {
			Authorization: `Bearer ${config.whatsappApiToken}`,
			'Content-Type': 'application/json'
		};

		let sendTo: any;

		if (whatsapp) {
			sendTo = whatsapp;
		} else if (managerNumber) {
			sendTo = managerNumber;
		} else if (ownerWhatsapp) {
			sendTo = ownerWhatsapp;
		} else if (contact) {
			sendTo = contact;
		}
		const requestData = {
			messaging_product: 'whatsapp',
			recipient_type: 'individual',
			to: sendTo,
			type: 'template',
			template: {
				name: 'new_order_received',
				language: {
					code: 'en'
				}
			}
		};

		try {
			const response = await axios.post(
				'https://graph.facebook.com/v17.0/101557882761538/messages',
				requestData,
				{ headers }
			);
			if (response.status === 200) {
				const seller: any = await Seller.findOne({ contact: contact });
				let updateObject = {
					'whatsAppSmsCount.updatedTime': new Date(),
					'whatsAppSmsCount.lastTemplateType': 'utility'
				};

				updateObject['whatsAppSmsCount.utility'] = seller.whatsAppSmsCount.utility + 1;
				updateObject['whatsAppSmsCount.lastTemplateType'] = requestData.template.name;
				await Seller.updateOne(
					{ _id: seller._id },
					{
						$set: updateObject
					},
					{ upsert: true }
				);
			}
			return;
		} catch (error) {
			console.error(error);
		}
	} catch (error) {
		console.error(error);
	}
};

//send order reject whatsapp msg to buyer
export const sendRejectOrderMessage = async (data: any) => {
	try {
		const orderID = data[0]?._id;
		if (!orderID) throw new Error('Order ID not found.');

		const order: any = await Order.findById(orderID).populate('seller buyer');
		if (!order) throw new Error('Order not found.');

		const { buyer, seller } = order;
		if (!buyer?.contact) throw new Error('Buyer not found.');

		const requestData: any = {
			messaging_product: 'whatsapp',
			recipient_type: 'individual',
			to: buyer.contact,
			type: 'template',
			template: {
				name: 'buyer_order_reject',
				language: { code: 'en_US' },
				components: [
					{
						type: 'body',
						parameters: [
							{ type: 'text', text: `${orderID.slice(-5).toUpperCase()}` },
							{ type: 'text', text: `*${seller?.businessName || 'Seller'}*` },
							{ type: 'text', text: `*${data[0]?.remarks}*` }
						]
					},
					{
						type: 'button',
						sub_type: 'url',
						index: '0',
						parameters: [{ type: 'text', text: orderID }]
					}
				]
			}
		};

		const headers = {
			Authorization: `Bearer ${config.whatsappApiToken}`,
			'Content-Type': 'application/json'
		};

		try {
			const response: any = await axios.post(
				'https://graph.facebook.com/v17.0/101557882761538/messages',
				requestData,
				{ headers }
			);

			const newMessage: any = {
				reply: requestData?.template?.name + '  order _id : ' + orderID,
				sentTime: new Date()
			};

			const whatsappCustomer = await WhatsApp.findOne({ contact: buyer.contact });
			const customer = await Customer.findOne({ contact: buyer.contact });

			let updateObject = {
				'whatsAppSmsCount.updatedTime': new Date(),
				'whatsAppSmsCount.lastTemplateType': requestData?.template?.name
			};

			updateObject['whatsAppSmsCount.utility'] = customer.whatsAppSmsCount.utility + 1;

			const x = await Customer.updateOne(
				{ _id: customer._id },
				{
					$set: updateObject
				},
				{ upsert: true }
			);

			if (response.status == '200') {
				whatsappCustomer.message.push(newMessage);
				await whatsappCustomer.save();

				return newMessage;
			}
		} catch (error) {
			console.error(error);
		}
	} catch (error) {
		console.error(error.message);
	}
};

export const updateAgentName = async (data: any) => {
	try {
		const { id, agent } = data;
		await WhatsApp.updateOne(
			{
				_id: id
			},
			{
				$set: {
					agent: agent
				}
			}
		);
	} catch (error) {
		throwError(error);
	}
};
export const closeIssueAndUpdateRemark = async (data: any) => {
	try {
		const { id, issue, solution, solutionProvidedBy } = data;
		const remark = {
			issue,
			solution,
			solutionProvidedBy,
			updateTime: new Date()
		};

		await WhatsApp.updateOne(
			{ _id: id },
			{
				$push: {
					pastIssues: remark
				},
				$set: {
					closedTime: new Date(),
					open: false,
					unread: false,
					agent: ''
				}
			}
		);
	} catch (error) {
		throwError(error);
	}
};
