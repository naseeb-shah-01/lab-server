import { generateOTP } from '../../helpers/otp';
import { IRider } from '../../models/rider/rider';
import { model } from 'mongoose';
import config from '../../../config.json';
import { throwError } from '../../helpers/throw-errors';
import { getSessionById } from '../../helpers/server-helper';
import { createRiderSession, removeSessions } from '../rider/session';
import { deletePrivateProps } from '../../helpers/query';
import { sendSMS } from '../../helpers/sms';
import { smsTemplates } from '../../helpers/sms-templates';

const Rider = model<IRider>('Rider');

export const sendLoginOtp = async (contact) => {
	try {
		if (!contact) {
			throwError(400);
		}
		let rider = await Rider.findOne({
			contact: contact
		});
		if (!rider) {
			rider = new Rider({ contact: contact });
			await rider.save();
		}

		if (rider.status !== 'active') {
			throwError(401, 'Account is disabled.', 'ACCOUNT_DISABLED');
		}

		let otp = !config.demoAccounts?.includes(contact) ? generateOTP() : 1234;
		rider.otp = otp;
		await rider.save({ timestamps: false });

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

		let rider = await Rider.findOne({
			status: 'active',
			contact: data.contact
		}).select(
			'name contact otp kyc kycStage approved sockets sessions updatedAt fcmTokens available'
		);
		if (rider.sessions.length) {
			throwError(401, 'Please logout from all other devices.', 'MULTIPLE_SESSIONS');
		}

		removeSessions(rider);

		if (!rider) {
			throwError(404);
		}

		if (rider.otp !== data.otp) {
			throwError(401);
		}

		if (data.fcmToken) {
			if (!rider.fcmTokens) {
				rider.fcmTokens = [];
			}
			if (!rider.fcmTokens.find((token) => token === data.fcmToken)) {
				rider.fcmTokens.push(data.fcmToken);
			}
		}
		delete rider.otp;
		const sessions = [];
		for (const ses of rider.sessions) {
			const sessionDetails = await getSessionById(ses);
			if (sessionDetails) {
				sessions.push(ses);
			}
		}
		rider.sessions = sessions;
		if (!rider.sessions.find((s) => s === sessionID)) {
			rider.sessions.push(sessionID);
		}

		rider.sessions = rider.sessions;
		await rider.save({ timestamps: false });

		let sessionData = createRiderSession(rider);
		session.rider = sessionData;
		const riderData = rider.toJSON();
		delete riderData.sessions;

		return {
			rider: riderData,
			token: sessionID
		};
	} catch (error) {
		throw error;
	}
};

export const renewUser = async (session) => {
	try {
		let userId = session?.rider?._id;

		if (userId) {
			let user = await Rider.findById(userId).select(
				'name contact register registerStage kyc kycStage approved sessions updatedAt'
			);
			let updatedAt = user.updatedAt;

			if (session.rider.updatedAt && session.rider.updatedAt > updatedAt) {
				updatedAt = session.rider.updatedAt;
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
		await Rider.findOneAndUpdate(
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
