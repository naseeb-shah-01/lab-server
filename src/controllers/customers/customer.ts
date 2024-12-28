import { setSessionById, getSessionById } from '../../helpers/server-helper';
import { model } from 'mongoose';
import { Request, Response } from 'express';
import { ISubscription } from '../../models/customer/subscription';
import { throwError } from '../../helpers/throw-errors';
import { deletePrivateProps } from '../../helpers/query';
import log from '../../helpers/logger';
import { createAdminNotification } from '../../helpers/notifications/admin';
import { sendAdminNotification } from '../../helpers/notifications/notification';
import { ISeller } from '../../models/customer/seller';
import PaytmChecksum from 'paytmchecksum';
import config from '../../../config.json';
import { tf2 } from '../../helpers/number';
import axios, { AxiosRequestConfig } from 'axios';
import { format } from 'date-fns';
import { IOrder } from '../../models/order/order';
import { subscriptionInvoice } from '../seller/invoices';
// import { paytm_Transaction_Settlement } from '../helpers/paytmSettlement';
var ifsc = require('ifsc');
import * as XLSX from 'xlsx';

const path = require('path');
const Subscription = model<ISubscription>('Subscription');
const types = ['buyer', 'seller'];
const Seller = model<ISeller>('NewCustomer');
const Order = model<IOrder>('Order');

export const getSellerKycDetails = async (user) => {
	try {
		let seller = await Seller.findById(user?._id)
			.populate({
				path: 'productCategory',
				match: {
					status: 'active',
					level: 1
				},
				options: { lean: true }
			})
			.lean();

		if (!seller) {
			throwError(404);
		}
		delete seller.otp;
		delete seller.sessions;
		delete seller.fcmTokens;

		return seller;
	} catch (error) {
		throw error;
	}
};

export const addBusinessDetails = async (data, user) => {
	try {
		if (data.packingTime || data.deliveryMode) {
			let seller = await Seller.findByIdAndUpdate(
				user?._id,
				{
					$set: data
				},
				{ new: true, useFindAndModify: false }
			).lean();
			return seller;
		}
		if (
			!data ||
			!data.businessName ||
			!data.contactPerson ||
			!data.name ||
			!data.address ||
			!data.address.line1 ||
			!data.address.state ||
			!data.address.city ||
			!data.address.pincode ||
			!data.kycType ||
			!types.includes(data.kycType)
		) {
			throwError(400);
		}

		data = deletePrivateProps(data);

		if (data.kycType === 'seller') {
			data.seller = true;
		} else if (data.kycType === 'buyer') {
			data.buyer = true;
		}

		data.addresses = [
			{
				primary: true,
				billing: true,
				...data.address
			}
		];
		data.updatedBy = user?._id;
		data.kycStage = 'kycDocument';
		let seller = await Seller.findByIdAndUpdate(
			user?._id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();

		delete seller.otp;
		delete seller.sessions;
		delete seller.fcmTokens;

		return seller;
	} catch (error) {
		throw error;
	}
};

export const updateBusinessDetails = async (data, user) => {
	try {
		if (
			!data ||
			!data.businessName ||
			!data.contactPerson ||
			!data.name ||
			!data.address ||
			!data.address.line1 ||
			!data.address.state ||
			!data.address.city ||
			!data.address.pincode ||
			!data.kycType ||
			!data.packingTime ||
			!data.deliveryMode ||
			!types.includes(data.kycType)
		) {
			throwError(400);
		}

		data = deletePrivateProps(data);

		if (data.kycType === 'seller') {
			data.seller = true;
		} else if (data.kycType === 'buyer') {
			data.buyer = true;
		}

		data.addresses = [
			{
				primary: true,
				billing: true,
				...data.address
			}
		];
		data.updatedBy = user?._id;
		let seller = await Seller.findByIdAndUpdate(
			user?._id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();

		delete seller.otp;
		delete seller.sessions;
		delete seller.fcmTokens;

		return seller;
	} catch (error) {
		throw error;
	}
};

export const validateKyc = async (
	req: Request,
	res: Response,
	data: any,
	cb: (upload: boolean) => {},
	file: any
) => {
	let files: any = req;
	let key = files?.files[0]?.fieldname ? files?.files[0]?.fieldname : '';

	// if (!data.kycType || !types.includes(data.kycType)) {
	// 	res.errorRes(400);
	// 	cb(false);
	// 	return;
	// }

	if (key === 'gstCertificate' && !JSON.parse(data[0]).gst) {
		res.errorRes(400);
		cb(false);
		return;
	} else {
		cb(true);
		return;
	}
};

export const addKycDocument = async (data, files, user) => {
	try {
		if (!files.length) {
			throwError(400);
		}
		let kycDocument = {};
		let kycData = {};
		data.forEach((jsonStr) => {
			const obj = JSON.parse(jsonStr);
			kycData = Object.assign({}, kycData, obj);
		});
		kycData = deletePrivateProps(kycData);

		// if (kycData.kycType === 'seller') {
		// 	kycData.seller = true;
		// } else if (kycData.kycType === 'buyer') {
		// 	kycData.buyer = true;
		// }

		for (let file of files) {
			if (!kycDocument.hasOwnProperty(file.fieldname)) {
				kycDocument[file.fieldname] = [file.location];
			} else {
				kycDocument[file.fieldname].push(file.location);
			}
		}

		kycData = Object.assign(kycData, {
			kycDocument: kycDocument,
			updatedBy: user?._id,
			kycStage: 'kycComplete'
		});

		// data.kyc = true;
		let seller = await Seller.findByIdAndUpdate(
			user?._id,
			{
				$set: kycData // update with the parsed object
			},
			{ new: true, useFindAndModify: false }
		).lean();

		sendApprovalNotifications(seller);
		delete seller.otp;
		delete seller.sessions;
		delete seller.fcmTokens;

		return seller;
	} catch (error) {
		throw error;
	}
};

const sendApprovalNotifications = async (seller: any) => {
	try {
		const adminNotification = createAdminNotification(
			seller.kycType === 'seller' ? 'ADMIN_SELLER_APPROVAL' : 'ADMIN_NEW_BUYER',
			null,
			seller
		);
		sendAdminNotification(adminNotification);
	} catch (error) {
		console.error('Notification Error ', error);
	}
};

export const updateKycDocument = async (data, files, user) => {
	try {
		data = deletePrivateProps(data);
		let kycDocument = data?.kycDocument ? data.kycDocument : {};
		if (data.kycType === 'seller') {
			data.seller = true;
		} else if (data.kycType === 'buyer') {
			data.buyer = true;
		}

		if (files.length) {
			for (let file of files) {
				if (!kycDocument.hasOwnProperty(file.fieldname)) {
					kycDocument[file.fieldname] = [file.location];
				} else {
					kycDocument[file.fieldname].push(file.location);
				}
			}
		}
		data.kycDocument = kycDocument;

		data.updatedBy = user?._id;
		let seller = await Seller.findByIdAndUpdate(
			user?._id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();

		delete seller.otp;
		delete seller.sessions;
		delete seller.fcmTokens;

		return seller;
	} catch (error) {
		throw error;
	}
};

export const isDuplicate = async (contact, userId) => {
	try {
		let seller = await Seller.findOne({
			contact: contact,
			_id: { $ne: userId }
		});
		if (seller) {
			throwError(409);
		}
	} catch (error) {
		throw error;
	}
};

export const checkAndUpdateCustomerSessions = async (seller): Promise<ISeller> => {
	const removeSessions = [];
	for (const session of seller.sessions) {
		const sessionDetails = await getSessionById(session);
		if (sessionDetails) {
			setSessionById(session, sessionDetails);
		} else {
			removeSessions.push(session);
		}
	}
	if (removeSessions.length) {
		seller = await Seller.findByIdAndUpdate(
			seller._id,
			{
				$pullAll: {
					sessions: removeSessions
				}
			},
			{
				new: true,
				useFindAndModify: false,
				timestamps: false
			}
		).lean();
	}
	return seller;
};

export const requestForSellerApproval = async (seller) => {
	try {
		let sellerDetails = await Seller.findByIdAndUpdate(
			seller?._id,
			{
				$set: {
					approved: false
				}
			},
			{ new: true, useFindAndModify: false }
		).lean();

		delete sellerDetails.otp;
		delete sellerDetails.sessions;
		delete sellerDetails.fcmTokens;

		return sellerDetails;
	} catch (error) {
		throw error;
	}
};

export const setCustomerType = async (userId: string, type: 'buyer' | 'seller') => {
	try {
		const user = await Seller.findById(userId);
		if (user) {
			if (type === 'buyer') {
				user.buyer = true;
				await user.save();
			} else {
				if (type === 'seller') {
					user.seller = true;
					await user.save();
				}
			}
		}
	} catch (error) {
		log.error('Cannot update customer type : ', error);
	}
};
export const verifyCoupon = async (req, res) => {
	try {
		const validCoupons = ['SALE10', 'SALE20', 'SALE15', 'SALE20'];
		const coupon = req.coupon;
		if (validCoupons.includes(coupon)) {
			return true;
		} else {
			throw new Error('Invalid coupon code');
		}
	} catch (error) {
		throw new Error('Invalid coupon code');
	}
};
// subscription paytm implemented
export const preparePaytmSubscription = async (data, user) => {
	let isFreeTrialApplicable = false;

	const hasPreviousSubscription = await Subscription.findOne({
		seller: user?._id,
		$or: [{ invoices: { $exists: true, $ne: [] } }, { status: 'active' }]
	});

	if (!hasPreviousSubscription) {
		isFreeTrialApplicable = true;
	}

	let trialEndDate = new Date();
	let subscriptionExpiryDate = new Date();
	if (isFreeTrialApplicable) {
		if (data.calendarType === 'WEEK') {
			trialEndDate = new Date();
			trialEndDate.setDate(trialEndDate.getDate() + 90); // 30 days free trial for weekly plan
		} else if (data.calendarType === 'MONTH') {
			trialEndDate = new Date();
			trialEndDate.setDate(trialEndDate.getDate() + 90);
		} else if (data.calendarType === 'QUARTER') {
			trialEndDate = new Date();
			trialEndDate.setDate(trialEndDate.getDate() + 90);
		}
	}
	subscriptionExpiryDate.setDate(trialEndDate.getDate() + 365);
	const gst = 18;
	let subscriptionAmount = Number(data.amount);
	let splitdiscountValue = data.discount;
	let finalAmount = 0;
	if (splitdiscountValue) {
		finalAmount = subscriptionAmount - subscriptionAmount * (splitdiscountValue / 100);
		finalAmount = finalAmount + finalAmount * (gst / 100);
	} else {
		finalAmount = subscriptionAmount + subscriptionAmount * (gst / 100);
	}
	const planDetails = {
		gst: gst,
		subscriptionType: data.subscriptionType,
		calendarType: data.calendarType,
		subscriptionId: null,
		amount: subscriptionAmount,
		finalAmount: finalAmount,
		txnToken: null,
		date: new Date(),
		trialEndDate: trialEndDate,
		expiryDate: subscriptionExpiryDate,
		discount: splitdiscountValue,
		status: 'inactive',
		seller: user?._id
	};
	const subscription = new Subscription(planDetails);
	let paytmParams: any = {};

	paytmParams.body = {
		requestType: 'NATIVE_SUBSCRIPTION',
		mid: config.paytm.paytm_mid,
		websiteName: config.paytm.paytm_website,
		orderId: subscription._id.toString(),
		callbackUrl: config.paytm.paytm_callback_url + `?ORDER_ID=${subscription._id}`,
		subscriptionAmountType: 'FIX',
		// subscriptionMaxAmount: '2000',
		subscriptionFrequency: '1',
		// subscriptionPaymentMode: 'UPI',
		subscriptionFrequencyUnit: subscription.calendarType,
		subscriptionStartDate: format(subscription.trialEndDate, 'yyyy-MM-dd'),
		subscriptionExpiryDate: format(subscription.expiryDate, 'yyyy-MM-dd'),
		subscriptionGraceDays: '3',
		subscriptionEnableRetry: '1',
		autoRenewal: true,
		txnAmount: {
			value: isFreeTrialApplicable ? '0.00' : tf2(subscription.finalAmount).toString(),
			currency: 'INR'
		},
		renewalAmount: tf2(subscription.finalAmount).toString(),
		userInfo: {
			custId: user?._id
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
		url: `${config.paytm.paytm_host}subscription/create?mid=${
			config.paytm.paytm_mid
		}&orderId=${subscription._id.toString()}`,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(postData)
		},
		data: postData
	};

	const paytmTransaction = await axios(options);

	if (paytmTransaction.data.body.resultInfo.resultMsg === 'Success') {
		subscription.subscriptionId = paytmTransaction.data.body.subscriptionId;
		subscription.txnToken = paytmTransaction.data.body.txnToken;
		subscription.save();

		return {
			_id: subscription._id,
			txnToken: subscription.txnToken,
			finalAmount: subscription.finalAmount,
			isFreeTrialApplicable
		};
	} else {
		throw new Error('Unable to create subscription');
	}
};

export const capturedPaytmSubscriptionPayment = async (paytmOrderId) => {
	const subscription = await Subscription.findById(paytmOrderId);
	if (subscription) {
		subscription.status = 'active';
		subscription.save();
		const seller = await Seller.findOne(
			{
				_id: subscription.seller
			},
			{ _id: 1, kyc: 1 }
		);

		seller.subscription = subscription._id;
		seller.kyc = true;

		seller.save();

		subscriptionInvoice(subscription._id, seller._id);
	}
};

// excel sheet

// checkMerchantList()

// bank details
export const bankDetails = async (data, user) => {
	try {
		if (data.bankDetails) {
			let beneficiary = await Seller.findByIdAndUpdate(
				user?._id,
				{
					$set: data
				},
				{ new: true, useFindAndModify: false }
			).lean();

			return beneficiary;
		}
	} catch (error) {
		throw error;
	}
};

export const ifscCodeValidations = async (query) => {
	try {
		if (query.ifsc.length > 11 && query.ifsc.length < 11) {
			throw new Error('Invalid ifsc');
		}
		const bankDetails = await ifsc.fetchDetails(query.ifsc).then((res) => res);

		return bankDetails;
	} catch (error) {
		throw new Error('Invalid ifsc');
	}
};

// ifscCodeValidations()
// export const checkMerchantSettlementList = async () => {

//     try {
//         ;

//         const heading = [
//             [
//                 'Transaction Type',
//                 'Beneficiary Code',
//                 // 'Beneficiary A/c No.',
//                 // 'Transaction Amount',
//                 // 'Beneficiary Name',
//                 // 'Drawee Location',
//                 // 'Print Location',
//                 // 'Beneficiary add line1',
//                 // 'Beneficiary add line2',
//                 // 'Beneficiary add line3',
//                 // 'Beneficiary add line4',
//                 // 'ZipCode',
//                 // 'Instrument Ref No.',
//                 // 'Customer ref No.',
//                 // 'Advising Detail1',
//                 // 'Advising Detail2',
//                 // 'Advising Detail3',
//                 // 'Advising Detail4',
//                 // 'Advising Detail5',
//                 // 'Advising Detail5',
//                 // 'Advising Detail6',
//                 // 'Advising Detail7',
//                 // 'Cheque No.',
//                 // 'Instrument Date',
//                 // 'MICR No',
//                 // 'IFSC Code',
//                 // 'Bene Bank Name',
//                 // 'Bene Bank Branch',
//                 // 'Bene Email ID',
//                 // 'Debit A/C Number',
//                 // 'Source Narratio',
//                 // 'Target Narration',
//                 // 'Value Date'
//             ]
//         ];

//         const filePath = path.join(__dirname, '../settleMent.xlsx');
//         const settlementdata = [
//         //     { Transaction_Type: 'IMPS', Beneficiary_Code: 'Incode1234' },
//         // { Transaction_Type: 'INFO', Beneficiary_Code: 'Incode4321' },
//         // { Transaction_Type: 'INFOSSSSS', Beneficiary_Code: 'Incode4321' },
//         // { Transaction_Type: 'INFOSSSSS', Beneficiary_Code: 'Incode4321' }
//     ];
//         // Create a new Workbook
//         const workBook = XLSX.utils.book_new();
//         const workSheet = XLSX.utils.json_to_sheet([]);
//         XLSX.utils.sheet_add_aoa(workSheet, heading);

//         // Append a Worksheet to a Workbook
//         XLSX.utils.book_append_sheet(workBook, workSheet, 'Sheet1');

//         //Starting in the second row to avoid overriding and skipping heading
//         XLSX.utils.sheet_add_json(workSheet, settlementdata, { origin: 'A2', skipHeader: true });

//         // Generate buffer bookType property of the opts argument.type option, the data can be stored as a "binary string", JS string, Uint8Array or Buffer.
//         XLSX.write(workBook, { bookType: 'xlsx', type: 'buffer' });
//         XLSX.writeFile(workBook, filePath, { bookType: 'xlsx', type: 'file' });
//         // Binary string
//         XLSX.write(workBook, { bookType: 'xlsx', type: 'binary' });

//         ;
//         // res.end('data Added successfully')
//         // res.download('C:/Users/ashok/OneDrive/Desktop/veerji-api-main/src/controllers/1346899087.xlsx')
//     } catch (error) {
//         ;
//         throw error;
//     }
// };

// checkMerchantSettlementList()

// ifsc validationResult
