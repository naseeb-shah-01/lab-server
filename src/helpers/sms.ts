import config from '../../config.json';
import axios from 'axios';
import { throwError } from './throw-errors';

export const sendSMS = async (tempId, mobile, message) => {
	try {
		if (mobile && message) {
			//old one
			// const url =
			// 	config.sms.url +
			// 	'&secret=' +
			// 	config.sms.secret +
			// 	'&sender=' +
			// 	config.sms.sender +
			// 	'&tempid=' +
			// 	tempId +
			// 	'&receiver=' +
			// 	mobile +
			// 	'&route=TA&msgtype=1&sms=' +
			// 	message ;

			//according to bulk sms gateway integration
			const url =
				config.sms.url +
				'&mobile=' +
				mobile +
				'&message=' +
				encodeURIComponent(message) +
				'&sender=' +
				config.sms.sender +
				'&type=3' +
				'&template_id=' +
				tempId +
				'&secret=' +
				config.sms.secret +
				'&sender=' +
				config.sms.sender;

			if (config.env === 'production' || config.env === 'beta') {
				const sms = await axios.get(url);
				return sms;
			} else {
				return;
			}
		}
	} catch (error) {
		console.error(error);
	}
};
