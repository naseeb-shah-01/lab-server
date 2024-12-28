import { throwError } from '../../helpers/throw-errors';
import { IOrder, IOrderItem } from '../../models/order/order';
import { ITopUpOrder } from '../../models/order/topUpOrder';
import { model } from 'mongoose';
import { tf0, tf2 } from '../../helpers/number';
import { ICustomer } from '../../models/customer/customer';
import PaytmChecksum from 'paytmchecksum';
import config from '../../../config.json';
import { IUser } from '../../models/user/user';
import { setCustomerType } from './customer';
import axios, { AxiosRequestConfig } from 'axios';

const Customer = model<ICustomer>('Customer');
const User = model<IUser>('User');
const TopUpOrder = model<ITopUpOrder>('TopUpOrder');
// const Order = model<ITopUpOrder>('Order');

export const topUpWallet = async (data: ITopUpOrder & Record<string, any>, user) => {
	try {
		// Check if all required fields are present in data
		const requiredFields = ['amount'];
		const missingFields = requiredFields.filter((field) => !(field in data));
		if (missingFields.length > 0) {
			throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
		}
		if (!user) {
			throw new Error('User not found');
		}

		const orderData = {
			buyer: user._id,
			paymentMode: 'online',
			amount: +data.amount,
			status: 'pending',
			onlinePayment: {
				paymentId: '',
				txnToken: '',
				signature: '',
				amount: +data.amount
			},
			createdBy: user._id,
			createdByModel: 'Customer'
		};

		const order = new TopUpOrder(orderData);
		const paytmOrder = await preparePaytmOrder(order);
		if (paytmOrder.body.resultInfo.resultMsg === 'Success') {
			order.onlinePayment.txnToken = paytmOrder.body.txnToken;
			order.save();
			return order;
		} else {
			throw new Error('Unable to top up wallet');
		}
	} catch (error) {
		throw error;
	}
};

export const failWalletTopUp = async (topUpOrderId, user) => {
	try {
		if (!user) {
			throw new Error('User not found');
		}
		const order = await TopUpOrder.findById(topUpOrderId);
		if (!order) {
			throw new Error('Order not found');
		}
		if (order.status !== 'pending') {
			throw new Error('Order is not pending');
		}
		order.status = 'failed';
		order.save();
		return order;
	} catch (error) {
		throw error;
	}
};

const preparePaytmOrder = async (data: ITopUpOrder) => {
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
		}
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
