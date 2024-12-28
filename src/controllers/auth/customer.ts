import { generateOTP } from '../../helpers/otp';
import { ICustomer } from '../../models/customer/customer';
import { model } from 'mongoose';
import config from '../../../config.json';
import { throwError } from '../../helpers/throw-errors';
import { getSessionById } from '../../helpers/server-helper';
import { createCustomerSession } from '../customers/session';
import { createBuyerNotification } from '../../helpers/notifications/buyer';
import { deletePrivateProps } from '../../helpers/query';
import { sendSMS } from '../../helpers/sms';
import { smsTemplates } from '../../helpers/sms-templates';
import { sendBuyerNotification } from '../../helpers/notifications/notification';
import { send } from 'process';

const Customer = model<ICustomer>('Customer');

const randomNumberBetween30and40 = () => {
	return Math.floor(Math.random() * (40 - 30 + 1) + 30);
};

export const sendLoginOtp = async (data) => {
	try {
		let { contact, deviceInfo } = data;

		if (!contact) {
			throwError(400);
		}
		let newUser = false;
		let customer = await Customer.findOne({
			contact: contact
		});
		if (!customer) {
			customer = new Customer({
				contact: contact,
				deviceInfo: [deviceInfo]
			});
			newUser = true;
			await customer.save();

			try {
				const buyerNotification = createBuyerNotification(
					'BUYER_SIGNUP',
					customer?._id,
					{}
				);
				sendBuyerNotification(buyerNotification);
			} catch (error) {
				console.error(error);
			}
		}

		if (customer.status !== 'active') {
			throwError(401, 'Account is disabled.', 'ACCOUNT_DISABLED');
		}
		if (!newUser) {
			if (deviceInfo?.version && deviceInfo?.platform) {
				customer.deviceInfo = customer?.deviceInfo?.filter(
					(info) =>
						info?.version != deviceInfo?.version?.toString() ||
						info?.platform != deviceInfo?.platform?.toString()
				);

				customer?.deviceInfo?.push(deviceInfo);
			}
		}
		let otp = !config.demoAccounts?.includes(contact) ? generateOTP() : 1234;
		customer.otp = otp;
		await customer.save({ timestamps: false });

		if (contact && otp) {
			if (!config.demoAccounts?.includes(contact)) {
				sendSMS(
					smsTemplates.otp,
					contact,
					`${otp} is your QUICKIII Login OTP. Please do not share it with anyone. Regards, Team Quickiii (Formerly Veerji) [By Aekatr Technology and Services]`
				);
			}
		}

		if (config.env === 'production' || config.env === 'beta') {
			return { newUser: newUser };
		} else {
			return {
				newUser: newUser,
				otp: otp
			};
		}
	} catch (error) {
		throw error;
	}
};

export const verifyLoginOtp = async (data, session, sessionID) => {
	try {
		if (!data.contact || !data.otp) {
			throwError(400);
		}

		let customer = await Customer.findOne({
			status: 'active',
			contact: data.contact
		}).select(
			'name contact otp register registerStage kyc kycStage approved sessions updatedAt fcmTokens shopStatus'
		);

		if (!customer) {
			throwError(404);
		}

		if (customer.otp !== data.otp) {
			throwError(401);
		}

		if (data.referral) {
			// Find the customer with the referral code, use case insensitive search using regex
			let referenceCustomer = await Customer.findOne({
				'referral.mycode': { $regex: data.referral, $options: 'i' }
			})
				.select('referral')
				.lean();
			if (referenceCustomer) {
				customer.referral.usedcode = data.referral;
			}
		}

		let code = customer.id.slice(18, 24);
		// check that code uniqe or not
		let uniqe = Customer.find({ 'referral.mycode': code });
		if (!uniqe) {
			code = code + 'q';
		}
		customer.referral.mycode = code;
		if (data.fcmToken) {
			if (!customer.fcmTokens) {
				customer.fcmTokens = [];
			}
			if (!customer.fcmTokens.find((token) => token === data.fcmToken)) {
				customer.fcmTokens.push(data.fcmToken);
			}
		}
		delete customer.otp;
		const sessions = [];
		for (const ses of customer.sessions) {
			const sessionDetails = await getSessionById(ses);
			if (sessionDetails) {
				sessions.push(ses);
			}
		}
		customer.sessions = sessions;
		if (!customer.sessions.find((s) => s === sessionID)) {
			customer.sessions.push(sessionID);
		}

		customer.sessions = customer.sessions;
		await customer.save({ timestamps: false });

		let sessionData = createCustomerSession(customer);
		session.customer = sessionData;
		const customerData = customer.toJSON();
		delete customerData.sessions;

		return {
			customer: customerData,
			token: sessionID
		};
	} catch (error) {
		throw error;
	}
};

export const renewUser = async (session) => {
	try {
		let userId = session?.customer?._id;

		if (userId) {
			let user = await Customer.findById(userId).select(
				'name contact register registerStage kyc kycStage approved sessions updatedAt'
			);
			let updatedAt = user.updatedAt;

			if (session.customer.updatedAt && session.customer.updatedAt > updatedAt) {
				updatedAt = session.customer.updatedAt;
			}
			user.updatedAt = updatedAt;
			return user;
		} else {
			throwError(401);
		}
	} catch (error) {
		throw error;
	}
};

export const logoutUser = async (session, sessionID, data) => {
	try {
		await Customer.findOneAndUpdate(
			{
				sessions: sessionID
			},
			{
				$pull: {
					sessions: sessionID,
					fcmTokens: data.fcmToken
				}
			},
			{ useFindAndModify: false, timestamps: false }
		);
		session.destroy();

		return;
	} catch (error) {
		throw error;
	}
};
