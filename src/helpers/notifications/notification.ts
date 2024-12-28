import { model } from 'mongoose';
import { ICustomer } from '../../models/customer/customer';
import { IUser } from '../../models/user/user';
import { createAdminNotification } from './admin';
import { createBuyerNotification } from './buyer';
import { createSellerNotification } from './seller';
import config from '../../../config.json';
import { INotification } from '../../models/notification/notification';
import { sendSMS } from '../sms';
import { sendEmail } from '../mailer';
import { sendFCMNotification, sendRiderFCMNotification, sendSellerFCMNotification } from './fcm';
import { smsTemplates } from '../sms-templates';
import { IRider } from '../../models/rider/rider';
import { createRiderNotification } from './rider';
import { ISeller } from '../../models/customer/seller';

const Customer = model<ICustomer>('Customer');
const Seller = model<ISeller>('NewCustomer');
const User = model<IUser>('User');
const Rider = model<IRider>('Rider');
const Notification = model<INotification>('Notification');

export const sendAdminNotification = async (
	notification: ReturnType<typeof createAdminNotification>
) => {
	try {
		const admins = await User.find({
			status: 'active'
		});
		if (admins?.length) {
			for (let admin of admins) {
				try {
					const newNotification = new Notification({
						...notification,
						user: admin._id
					});
					newNotification.save();
				} catch (err) {}
				if (notification.socket) {
					if (admin.sockets?.length) {
						for (let socket of admin.sockets) {
							try {
								global.io
									.to(socket)
									.emit('newAdminNotification', notification.message);
							} catch (err) {}
						}
					}
				}
				if (notification.sms) {
					try {
						sendSMS(
							smsTemplates[notification.sms],
							admin.contact,
							notification.message
						);
					} catch (err) {}
				}
			}
		}
		if (notification.email) {
			if (notification.email && config?.email?.admin?.to?.length) {
				for (let to of config?.email?.admin?.to) {
					try {
						sendEmail({
							to: to,
							subject: 'Veerji',
							text: notification.message
						});
					} catch (error) {}
				}
			}
		}
	} catch (err) {
		console.error(err);
	}
};

export const sendSellerNotification = async (
	notification: ReturnType<typeof createSellerNotification>
) => {
	try {
		const seller = await Seller.findById(notification.user);
		if (seller) {
			try {
				const newNotification = new Notification({
					...notification,
					user: notification.user
				});
				newNotification.save();
			} catch (err) {}
			if (notification.socket) {
				if (seller.sockets?.length) {
					for (let socket of seller.sockets) {
						try {
							global.io.to(socket).emit('newSellerNotification', notification);
						} catch (err) {}
					}
				}
			}
			if (notification.fcm && seller.fcmTokens?.length) {
				try {
					sendSellerFCMNotification(notification, seller.fcmTokens);
				} catch (err) {}
			}
			if (notification.sms) {
				try {
					sendSMS(smsTemplates[notification.sms], seller.contact, notification.message);
				} catch (err) {}
			}
			if (notification.email && seller.email) {
				try {
					sendEmail({
						to: seller.email,
						subject: 'Veerji',
						text: notification.message
					});
				} catch (err) {}
			}
		}
	} catch (err) {
		console.error(err);
	}
};

export const sendBuyerNotification = async (
	notification: ReturnType<typeof createBuyerNotification>
) => {
	try {
		const buyer = await Customer.findById(notification.user);
		if (buyer) {
			try {
				const newNotification = new Notification({
					...notification,
					user: notification.user
				});
				newNotification.save();
			} catch (err) {}
			if (notification.fcm && buyer.fcmTokens?.length) {
				try {
					sendFCMNotification(notification, buyer.fcmTokens);
				} catch (err) {}
			}
			if (notification.sms) {
				try {
					sendSMS(smsTemplates[notification.sms], buyer.contact, notification.message);
				} catch (err) {}
			}
			if (notification.email && buyer.email) {
				try {
					sendEmail({
						to: buyer.email,
						subject: 'Veerji',
						text: notification.message
					});
				} catch (err) {}
			}
		}
	} catch (err) {
		console.error(err);
	}
};

export const sendRiderNotification = async (
	notification: ReturnType<typeof createRiderNotification>
) => {
	try {
		const rider = await Rider.findById(notification.user);
		if (rider) {
			try {
				const newNotification = new Notification({
					...notification,
					user: notification.user
				});
				newNotification.save();
			} catch (err) {}
			if (notification.fcm && rider.fcmTokens?.length) {
				try {
					sendRiderFCMNotification(notification, rider.fcmTokens);
				} catch (err) {}
			}
			if (notification.sms) {
				try {
					sendSMS(smsTemplates[notification.sms], rider.contact, notification.message);
				} catch (err) {}
			}
			if (notification.email && rider.email) {
				try {
					sendEmail({
						to: rider.email,
						subject: 'Veerji',
						text: notification.message
					});
				} catch (err) {}
			}
		}
	} catch (err) {
		console.error(err);
	}
};
