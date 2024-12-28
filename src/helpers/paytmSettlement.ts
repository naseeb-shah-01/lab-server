import axios, { AxiosRequestConfig } from 'axios';
import { Router } from 'express';
import PaytmChecksum from 'paytmchecksum';
import qs from 'qs';
import config from '../../config.json';
import { IOrder } from '../models/order/order';
import { model } from 'mongoose';

const Order = model<IOrder>('Order');

export const paytm_Transaction_Settlement = async (
	startDate: string,
	endDate: string,
	pageNum: string,
	pageSize: string
) => {
	try {
		let paytmParams: any = {};

		paytmParams['MID'] = config.paytm.paytm_mid;
		paytmParams['utrProcessedStartTime'] = startDate;
		paytmParams['utrProcessedEndTime'] = endDate;
		paytmParams['pageNum'] = pageNum;
		paytmParams['pageSize'] = pageSize;
		const paytmChecksum = await PaytmChecksum.generateSignature(
			paytmParams,
			config.paytm.paytm_key
		);

		paytmParams['checksumHash'] = paytmChecksum;

		var post_data = paytmParams;

		const options: AxiosRequestConfig = {
			/* for Production */
			url: `${config.paytm.paytm_host}/merchant-settlement-service/settlement/list`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': post_data.length
			},
			data: post_data
		};

		const paytmSettlement = await axios(options);
		return;
		const {
			settlementListResponse: { settlementTransactionList, totalCount }
		} = paytmSettlement.data;

		if (totalCount > 0) {
			settlementTransactionList.map(async (el) => {
				let order = await Order.findByIdAndUpdate(el.ORDERID, {
					$set: {
						'onlinePayment.gatewayGST': el.GST,
						'onlinePayment.gatewayCommission': el.COMMISSION,
						'onlinePayment.netSettlement': el.SETTLEDAMOUNT
					}
				});
			});
		}
	} catch (error) {}
};
