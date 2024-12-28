import axios from 'axios';
import config from '../../../config.json';
import { ICustomer } from '../../models/customer/customer';
import { model, Types } from 'mongoose';
import { IOrder } from '../../models/order/order';
const Customer = model<ICustomer>('Customer');
const Order = model<IOrder>('Order');
const ObjectId = Types.ObjectId;

export const sendNewOrderMessageToDiscord = async (orderData: any) => {
	try {
		if (!orderData) {
			return;
		}
		const { _id, seller, buyer } = orderData;

		const data = {
			content: `**New Order** \n\nOrder ID : ${_id}\n\nSeller : ${
				seller.businessName
			}\nSeller Contact : ${seller.contact}\n\nBuyer : ${
				buyer.name || '-'
			}\nBuyer Contact : ${buyer.contact}`
		};
		try {
			const response: any = await axios.post(config.discordUrl, data);
			return;
		} catch (err) {
			console.error(err);
		}
	} catch (error) {
		console.error(error);
	}
};

export const sendNewWhatsappMessageToDiscord = async (from: any, text: string) => {
	try {
		if (!from) {
			return;
		}

		const buyer: any = await Customer.findOne({ contact: from });
		let name: any;
		if (buyer) {
			name = buyer.name;
		} else {
			name = '-';
		}

		const data = {
			content: `**New WhatsApp Message** \n\n From : ${from}\n\nName : ${name}\n\nMessage : ${
				text || '-'
			}`
		};
		try {
			const response: any = await axios.post(config.discordWhatsappMsgUrl, data);
			return;
		} catch (err) {
			console.error(err);
		}
	} catch (error) {
		console.error(error);
	}
};

export const sendNewOrderReturnRequestMessageToDiscord = async (orderId: any) => {
	try {
		if (!orderId) {
			return;
		}

		const order: any = await Order.findOne({ _id: ObjectId(orderId) }).populate(
			'rider seller buyer'
		);

		const data = {
			content: `**New Return Request** \n\nOrder ID : ${orderId}\n\nSeller : ${
				order.seller.businessName
			}\nSeller Contact : ${order.seller.contact}\n\nBuyer : ${
				order.buyer.name || '-'
			}\nBuyer Contact : ${order.buyer.contact}\n\nRider : ${
				order.rider.name
			}\nRider Contact : ${order.rider.contact}\n\nReason : ${
				order.returnRequest.created.reason || '-'
			}\nRemark : ${order.returnRequest.created.remarks || '-'}`
		};

		try {
			const response: any = await axios.post(config.discordUrl, data);
			return;
		} catch (err) {
			console.error(err);
			return;
		}
	} catch (error) {
		console.error(error);
	}
};
export const sendPendingPaymentToDiscord = async (content) => {
	try {
		const data = {
			content: content
		};
		try {
			const response: any = await axios.post(config.discordPaymentUrl, data);
			return;
		} catch (err) {
			throw new Error(err);
		}
	} catch (error) {
		throw new Error(error);
	}
};
