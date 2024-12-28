import { generateOTP } from '../../helpers/otp';
import { ICustomer } from '../../models/customer/customer';
import { model } from 'mongoose';
import config from '../../../config.json';
import { throwError } from '../../helpers/throw-errors';
import { getSessionById } from '../../helpers/server-helper';
import { createSellerSession } from '../seller/session';
import { deletePrivateProps } from '../../helpers/query';
import { sendSMS } from '../../helpers/sms';
import { smsTemplates } from '../../helpers/sms-templates';
import { IReferralCode } from '../../models/customer/referralcode';
const ReferralCode = model<IReferralCode>('ReferralCode');
import { ISeller } from '../../models/customer/seller';
import { createSellerNotification } from '../../helpers/notifications/seller';
import { sendSellerNotification } from '../../helpers/notifications/notification';
const Seller = model<ISeller>('NewCustomer');

const randomNumberBetween10and50 = () => {
	return Math.floor(Math.random() * 9 + 1) * 5 + 5;
};
export const sendLoginOtp = async (contact) => {
	try {
		if (!contact) {
			throwError(400);
		}
		let newSeller = false;
		let seller = await Seller.findOne({
			contact: contact
		});
		if (!seller) {
			seller = new Seller({ contact: contact });
			newSeller = true;
			await seller.save();
		}

		if (seller.status !== 'active') {
			throwError(401, 'Account is disabled.', 'ACCOUNT_DISABLED');
		}

		let otp = !config.demoAccounts?.includes(contact) ? generateOTP() : 1234;
		seller.otp = otp;
		await seller.save({ timestamps: false });
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
			return { newSeller };
		} else {
			return {
				newSeller: newSeller,
				otp: otp
			};
		}
	} catch (error) {
		throw error;
	}
};

export const sendVerifiedLoginOtp = async (contact) => {
	try {
		if (!contact) {
			throwError(400);
		}
		let seller = await Seller.findOne({
			contact: contact
		});
		if (!seller) {
			throwError(401, 'You are not a registered user');
		}

		if (seller.status !== 'active') {
			throwError(401, 'Account is disabled.', 'ACCOUNT_DISABLED');
		}

		let otp = !config.demoAccounts?.includes(contact) ? generateOTP() : 1234;
		seller.otp = otp;
		await seller.save({ timestamps: false });

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
			return;
		} else {
			return {
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

		let seller = await Seller.findOne({
			status: 'active',
			contact: data.contact
		}).select(
			'name contact otp register registerStage kyc kycStage approved sessions updatedAt fcmTokens shopStatus'
		);

		if (!seller) {
			throwError(404);
		}

		if (seller.otp !== +data.otp) {
			throwError(401);
		}

		let amount = randomNumberBetween10and50();

		if (data.referral && !seller.referral.referredBy) {
			// Check if referral code exists and is valid
			let referenceSeller = await Seller.findOne({ 'referral.mycode': data.referral });
			if (referenceSeller) {
				seller.referral.usedcode = data.referral;
				seller.referral.referredBy = referenceSeller._id;
				if (seller.referral.usedcode) {
					throwError(400, 'Seller has already used a referral code');
					return;
				}
				seller.referredDiscount = amount;
				let notification = createSellerNotification(
					'SELLER_REFERRAL_CREATED',
					seller._id,
					amount
				);
				sendSellerNotification(notification);

				let coupon = await ReferralCode.findOne({ code: data.referral });
				if (!coupon) {
					coupon = new ReferralCode({
						code: data.referral,
						discountPercentage: amount,
						usedBy: [],
						seller: referenceSeller._id.toString()
					});
				}
				coupon.usedBy.push(seller._id);
				await coupon.save();
			} else {
				throwError(401, 'Invalid referral code');
				return;
			}
		} else {
			let code = seller._id.toString().slice(18, 24);
			let uniqe = Seller.findOne({ 'referral.mycode': code });
			if (!uniqe) {
				code = code + 'k';
			}
			seller.referral.mycode = code;
			let referralCoupon = new ReferralCode({
				code: code,
				discountPercentage: amount,
				usedBy: [],
				seller: seller._id.toString()
			});
		}

		if (data.fcmToken) {
			if (!seller.fcmTokens) {
				seller.fcmTokens = [];
			}
			if (!seller.fcmTokens.find((token) => token === data.fcmToken)) {
				seller.fcmTokens.push(data.fcmToken);
			}
		}

		delete seller.otp;
		const sessions = [];
		for (const ses of seller.sessions) {
			const sessionDetails = await getSessionById(ses);
			if (sessionDetails) {
				sessions.push(ses);
			}
		}
		seller.sessions = sessions;
		if (!seller.sessions.find((s) => s === sessionID)) {
			seller.sessions.push(sessionID);
		}

		seller.sessions = seller.sessions;
		await seller.save({ timestamps: false });

		let sessionData = createSellerSession(seller);
		session.seller = sessionData;
		const sellerData = seller.toJSON();
		delete sellerData.sessions;

		return {
			seller: sellerData,
			token: sessionID
		};
	} catch (error) {
		throw error;
	}
};

export const verifyReferralCode = async (query) => {
	try {
		const referralUser = await ReferralCode.findOne({ code: query.referral });

		if (!referralUser) {
			throwError(401, 'Invalid referral code');
		}
		return query;
	} catch (error) {
		throw error;
	}
};

export const renewUser = async (session) => {
	try {
		let userId = session?.seller?._id;

		if (userId) {
			let user = await Seller.findById(userId).select(
				'name contact register registerStage kyc kycStage approved sessions updatedAt'
			);
			let updatedAt = user.updatedAt;

			if (session.seller.updatedAt && session.seller.updatedAt > updatedAt) {
				updatedAt = session.seller.updatedAt;
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
		await Seller.findOneAndUpdate(
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
