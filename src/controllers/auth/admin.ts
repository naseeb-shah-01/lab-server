import { generateOTP } from '../../helpers/otp';
import { IUser } from '../../models/user/user';
import { model } from 'mongoose';
import config from '../../../config.json';
import { throwError } from '../../helpers/throw-errors';
import { getSessionById } from '../../helpers/server-helper';
import { createUserSession } from '../users/session';
import { sendSMS } from '../../helpers/sms';
import { smsTemplates } from '../../helpers/sms-templates';

const User = model<IUser>('User');

export const sendLoginOtp = async (contact) => {
	try {
		if (!contact) {
			throwError(400);
		}
		let user = await User.findOne({
			status: 'active',
			contact: contact
		});
		if (!user) {
			throwError(404);
		}

		let otp = generateOTP();
		user.otp = otp;
		await user.save();

		if (contact && otp) {
			sendSMS(
				smsTemplates.otp,
				contact,
				`${otp} is your QUICKIII Login OTP. Please do not share it with anyone. Regards, Team Quickiii (Formerly Veerji) [By Aekatr Technology and Services]`
			);
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

		let user = await User.findOne({
			status: 'active',
			contact: data.contact
		}).select('firstName lastName contact email otp status sessions updatedAt');

		if (!user) {
			throwError(404);
		}

		if (user.otp !== data.otp) {
			throwError(401);
		}

		const sessions = [];
		for (const ses of user.sessions) {
			const sessionDetails = await getSessionById(ses);
			if (sessionDetails) {
				sessions.push(ses);
			}
		}

		user.sessions = sessions;
		if (!user.sessions.find((s) => s === sessionID)) {
			user.sessions.push(sessionID);
		}

		user.sessions = user.sessions;
		await user.save();

		let sessionData = createUserSession(user);
		session.adminUser = sessionData;

		return {
			user: user,
			token: sessionID
		};
	} catch (error) {
		throw error;
	}
};

export const renewUser = async (session) => {
	try {
		let userId = session?.adminUser?._id;
		if (userId) {
			let user = await User.findById(userId).select(
				'firstName lastName contact email status sessions updatedAt'
			);
			let updatedAt = user.updatedAt;

			if (session.adminUser.updatedAt && session.adminUser.updatedAt > updatedAt) {
				updatedAt = session.adminUser.updatedAt;
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

export const logoutUser = async (session, sessionID) => {
	try {
		await User.findOneAndUpdate(
			{
				sessions: sessionID
			},
			{
				$pull: {
					sessions: sessionID
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
