import { model } from 'mongoose';
import { getResults } from '../../helpers/query';
import { QueryObj } from '../../middlewares/query';
import { ICustomer } from '../../models/customer/customer';
import { ISeller } from '../../models/customer/seller';
import { INotification } from '../../models/notification/notification';

const Notification = model<INotification>('Notification');
const Customer = model<ICustomer>('Customer');
const Seller = model<ISeller>('NewCustomer');

export const getAllNotifications = async (queryObj: QueryObj, user) => {
	try {
		let dbQuery = {
			userType: 'buyer',
			user: user._id
		};

		let results = await getResults(
			queryObj,
			Notification,
			dbQuery,
			{},
			'message',
			'createdAt',
			-1,
			10
		);
		return results;
	} catch (error) {
		throw error;
	}
};

export const getBuyerNotificationsCount = async (id: string) => {
	try {
		return await Notification.find({
			userType: 'buyer',
			clear: false,
			user: id
		}).countDocuments();
	} catch (error) {
		console.error(error);
		return 0;
	}
};

export const getSellerNotificationsCount = async (id: string) => {
	try {
		return await Notification.find({
			userType: 'seller',
			clear: false,
			user: id
		}).countDocuments();
	} catch (error) {
		console.error(error);
		return 0;
	}
};

export const clearBuyerNotifications = async (user) => {
	try {
		await Notification.updateMany(
			{
				userType: 'buyer',
				clear: false,
				user: user._id
			},
			{
				$set: {
					clear: true
				}
			},
			{ useFindAndModify: false }
		);
		const buyer = await Customer.findById(user._id);
		if (buyer) {
			for (let socketId of buyer.sockets) {
				const socket = global.io.sockets.sockets.get(socketId);
				socket.emit('buyerNotificationsUpdate', { count: 0 });
			}
		}
		return {};
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const clearSellerNotifications = async (user) => {
	try {
		await Notification.updateMany(
			{
				userType: 'seller',
				clear: false,
				user: user._id
			},
			{
				$set: {
					clear: true
				}
			},
			{ useFindAndModify: false }
		);
		const seller = await Seller.findById(user._id, { sockets: 1 });
		if (seller) {
			for (let socketId of seller.sockets) {
				const socket = global.io.sockets.sockets.get(socketId);
				socket.emit('sellerNotificationsUpdate', { count: 0 });
			}
		}
		return {};
	} catch (error) {
		console.error(error);
		throw error;
	}
};
