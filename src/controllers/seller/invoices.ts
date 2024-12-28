import { createPDF, savePDF } from '../../helpers/pdf';
import { renderFile } from 'ejs';
import path from 'path';

import * as XLSX from 'xlsx';

import { IOrder } from '../../models/order/order';
import { model, set } from 'mongoose';
const Penalty = model<IPenalty>('Penalty');

const Order = model<IOrder>('Order');
import { aekartaDetails } from '../../../config.json';
import { aekatra } from '../../assets/images.json';
import { formatRupee, shortNumber, tf0, tf2 } from '../../helpers/number';
import * as dateFns from 'date-fns';
import { QueryObj } from '../../middlewares/query';
import { getResults } from '../../helpers/query';
import { getWalletBalance } from '../buyer/buyer';
import { CronJob } from 'cron';
import { IPenalty } from '../../models/general/penalty';
import { platform } from 'os';
export const gatewayChargesRate = 2;
import { ISubscription } from '../../models/customer/subscription';
import { format } from 'date-fns';
import { ISeller } from '../../models/customer/seller';
import { ISettlement } from '../../models/general/settlement';
const Seller = model<ISeller>('NewCustomer');
const Subscription = model<ISubscription>('Subscription');
const Settlement = model<ISettlement>('Settlement');

export const generateInvoice = async (orderId: string, type: 'aekatra' | 'buyer' | 'delivery') => {
	try {
		const order = await Order.findById(orderId);
		if (order) {
			const viewName =
				type === 'delivery'
					? 'DeliveryInvoice.ejs'
					: type === 'aekatra'
					? 'AekatraInvoice.ejs'
					: 'BuyerInvoice.ejs';
			const html = await renderFile(
				path.resolve(__dirname, '../../assets/views/', viewName),
				{
					aekatra: aekartaDetails,
					date: dateFns.format(new Date(), 'dd/MM/yyyy'),
					logo: aekatra,
					order,
					tf2,
					formatRupee,
					shortNumber
				}
			);

			const pdfBuffer = await createPDF(html);
			const url = await savePDF(pdfBuffer, `${type}-${orderId}.pdf`);
			const latestOrder = await Order.findById(orderId);
			latestOrder.invoices[type] = url;
			await latestOrder.save();
		}
	} catch (error) {
		console.error(error);
	}
};

export const getInvoices = async (type: 'aekatra' | 'buyer', queryObj: QueryObj, user) => {
	try {
		const dbQuery = {
			seller: user._id,
			'cancelled.status': false,
			'rejected.status': false,
			'returned.status': false,
			[`invoices.${type}`]: { $exists: true, $ne: null }
		};
		const dbProject = {
			'sellerDetails.name': 1,
			invoiceNumber: 1,
			order: 1,
			invoices: 1,
			'items.name': 1
		};
		const results = await getResults(
			queryObj,
			Order,
			{},
			dbProject,
			'businessName',
			'createdAt',
			-1,
			15
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const subscriptionInvoice = async (subscriptionId: string, sellerId: string) => {
	try {
		const formatDate = (date) => {
			return dateFns.format(date, 'dd/MM/yyyy');
		};
		const seller = await Seller.findById(sellerId);
		const subscription = await Subscription.findById(subscriptionId);
		if (subscription) {
			const viewName = 'SubscriptionInvoice.ejs';
			const html = await renderFile(
				path.resolve(__dirname, '../../assets/views/', viewName),
				{
					aekatra: aekartaDetails,
					date: formatDate(new Date()),
					logo: aekatra,
					tf2,
					seller,
					subscription,
					formatDate,
					formatRupee,
					shortNumber
				}
			);

			const pdfBuffer = await createPDF(html);
			const url = await savePDF(
				pdfBuffer,
				`${subscription.subscriptionType}-${subscription.subscriptionId}.pdf`
			);
			subscription.invoices = [url, ...subscription.invoices];
			await subscription.save();
			return url;
		}
	} catch (error) {
		console.error(error);
	}
};
