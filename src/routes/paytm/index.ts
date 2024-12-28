import axios, { AxiosRequestConfig } from 'axios';
import { Router } from 'express';
import PaytmChecksum from 'paytmchecksum';
import qs from 'qs';
import config from '../../../config.json';
import {
	capturedPaytmOrderPayment,
	failedPaytmOrderPayment
} from '../../controllers/customers/order';
import log from '../../helpers/logger';
import { capturedPaytmSubscriptionPayment } from '../../controllers/customers/customer';
const router = Router();

router.post('/', (req, res) => {
	// Route for verifiying payment

	let body = '';

	req.on('data', function (data) {
		body += data;
	});

	req.on('end', function () {
		let html = '';
		const paytmResponse = qs.parse(body);

		// verify the checksum
		const checksumhash = paytmResponse.CHECKSUMHASH;
		// delete postData.CHECKSUMHASH;
		const result = PaytmChecksum.verifySignature(
			paytmResponse,
			config.paytm.paytm_key,
			checksumhash
		);

		// Send Server-to-Server request to verify Order Status
		let paytmParams: any = {};

		paytmParams.body = {
			mid: config.paytm.paytm_mid,
			orderId: paytmResponse.ORDERID
		};

		PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), config.paytm.paytm_key)
			.then((checksum) => {
				/* head parameters */
				paytmParams.head = {
					/* put generated checksum value here */
					signature: checksum
				};

				/* prepare JSON string for request */
				const postData = JSON.stringify(paytmParams);

				// Set up the request
				const options: AxiosRequestConfig = {
					/* for Production */
					// hostname: 'securegw.paytm.in',
					/* for Staging */
					url: `${config.paytm.paytm_host}v3/order/status`,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(postData)
					},
					data: postData
				};

				// post the data
				axios(options)
					.then(({ data }) => {
						const {
							head,
							body: {
								resultInfo: { resultStatus },
								orderId,
								txnId
							}
						} = data;
						if (resultStatus === 'TXN_SUCCESS') {
							capturedPaytmOrderPayment(orderId, txnId, head.signature);
						} else {
							failedPaytmOrderPayment(orderId, txnId, head.signature);
						}
					})
					.catch((error) => {
						console.error('Paytm Transaction Error: ', error, '\n');
						res.send('Unable to get transaction status');
					});
			})
			.catch((error) => {
				console.error('Error while generating checksum:', error);
				res.status(500).send('Error while generating checksum');
			});
	});
});

router.post('/subscription', (req, res) => {
	// Route for verifiying payment

	let body = '';

	req.on('data', function (data) {
		body += data;
	});

	req.on('end', function () {
		let html = '';
		const paytmResponse = qs.parse(body);

		// verify the checksum
		const checksumhash = paytmResponse.CHECKSUMHASH;
		// delete postData.CHECKSUMHASH;
		const result = PaytmChecksum.verifySignature(
			paytmResponse,
			config.paytm.paytm_key,
			checksumhash
		);

		// Send Server-to-Server request to verify Order Status
		let paytmParams: any = {};

		paytmParams.body = {
			mid: config.paytm.paytm_mid,
			orderId: paytmResponse.ORDERID
		};

		PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), config.paytm.paytm_key)
			.then((checksum) => {
				/* head parameters */
				paytmParams.head = {
					/* put generated checksum value here */
					signature: checksum
				};

				/* prepare JSON string for request */
				const postData = JSON.stringify(paytmParams);

				// Set up the request
				const options: AxiosRequestConfig = {
					/* for Production */
					// hostname: 'securegw.paytm.in',
					/* for Staging */
					url: `${config.paytm.paytm_host}v3/order/status`,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(postData)
					},
					data: postData
				};

				// post the data
				axios(options)
					.then(({ data }) => {
						const {
							head,
							body: {
								resultInfo: { resultStatus },
								orderId,
								txnId
							}
						} = data;
						if (resultStatus === 'TXN_SUCCESS') {
							capturedPaytmSubscriptionPayment(orderId);
						} else {
							failedPaytmOrderPayment(orderId, txnId, head.signature);
						}
					})
					.catch((error) => {
						console.error('Paytm Transaction Error: ', error, '\n');
						res.send('Unable to get transaction status');
					});
			})
			.catch((error) => {
				console.error('Error while generating checksum:', error);
				res.status(500).send('Error while generating checksum');
			});
	});
});

router.post('/txnStatus', (req, res) => {
	// Route for checking transaction status

	// Send Server-to-Server request to verify Order Status
	let paytmParams: any = {};

	paytmParams.body = {
		mid: config.paytm.paytm_mid,
		orderId: req.body.orderId
	};

	PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), config.paytm.paytm_key)
		.then((checksum) => {
			/* head parameters */
			paytmParams.head = {
				/* put generated checksum value here */
				signature: checksum
			};

			/* prepare JSON string for request */
			const postData = JSON.stringify(paytmParams);

			// Set up the request
			const options: AxiosRequestConfig = {
				/* for Production */
				// hostname: 'securegw.paytm.in',
				/* for Staging */
				url: `${config.paytm.paytm_host}v3/order/status`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(postData)
				},
				data: postData
			};

			// post the data
			axios(options)
				.then(({ data }) => {
					const {
						head,
						body: { resultInfo, orderId, txnId }
					} = data;
					if (req.body.paymentType == 'subscription') {
						if (resultInfo.resultStatus === 'TXN_SUCCESS') {
							capturedPaytmSubscriptionPayment(orderId);
						}
						res.send({ data: resultInfo.resultStatus });
					} else {
						if (resultInfo.resultStatus === 'TXN_SUCCESS') {
							capturedPaytmOrderPayment(orderId, txnId, head.signature);
						} else {
							failedPaytmOrderPayment(orderId, txnId, head.signature);
						}
					}
				})
				.catch((error) => {
					console.error('Paytm Transaction Error: ', error, '\n');
					res.send('Unable to get transaction status');
				});
		})
		.catch((error) => {
			console.error('Error while generating checksum:', error);
			res.status(500).send('Error while generating checksum');
		});
});

export default router;
