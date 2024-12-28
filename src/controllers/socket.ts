import { model } from 'mongoose';
import { ICustomer } from '../models/customer/customer';
import { ISeller } from '../models/customer/seller';
import { INotification } from '../models/notification/notification';
import { IUser } from '../models/user/user';
import { IRider } from '../models/rider/rider';

const Customer = model<ICustomer>('Customer');
const Seller = model<ISeller>('NewCustomer');
const User = model<IUser>('User');
const Notification = model<INotification>('Notification');
const Rider = model<IRider>('Rider');
export const connectUserSocket = async (socketData, socketId) => {
	if (socketData?.type === 'admin') {
		let user = await User.findOne({
			_id: socketData?.userId
		}).select('sessions sockets');
		if (!user) {
			return false;
		}

		if (!user.sessions.find((s) => s === socketData?.session)) {
			return false;
		}
		user.sockets = user.sockets.filter((socket) => !!global.io.sockets.sockets[socket]);
		user.sockets.push(socketId);
		await user.save();
		return true;
	} else if (socketData?.type === 'rider') {
		let user = await Rider.findOne({
			_id: socketData?.userId
		}).select('sessions sockets');
		if (!user) {
			return false;
		}

		if (!user.sessions.find((s) => s === socketData?.session)) {
			return false;
		}
		user.sockets = user.sockets.filter((socket) => !!global.io.sockets.sockets.get(socket));
		user.sockets.push(socketId);
		await user.save();
		return true;
	} else if (socketData?.type === 'customer') {
		let user = await Customer.findOne({
			_id: socketData?.userId
		}).select('sessions sockets');
		if (!user) {
			return false;
		}

		if (!user.sessions.find((s) => s === socketData?.session)) {
			return false;
		}
		user.sockets = user.sockets.filter((socket) => !!global.io.sockets.sockets.get(socket));
		user.sockets.push(socketId);
		await user.save();
		return true;
	} else {
		let user = await Seller.findOne({
			_id: socketData?.userId
		}).select('sessions sockets');
		if (!user) {
			return false;
		}

		if (!user.sessions.find((s) => s === socketData?.session)) {
			return false;
		}
		user.sockets = user.sockets.filter((socket) => !!global.io.sockets.sockets.get(socket));
		user.sockets.push(socketId);
		await user.save();
		return true;
	}
};

export const disconnectUserSocket = async (socketData, socketId) => {
	if (socketData?.type === 'admin') {
		await User.findOneAndUpdate(
			{
				sockets: socketId
			},
			{
				$pull: {
					sockets: socketId
				}
			},
			{ useFindAndModify: false, timestamps: false }
		);
		return true;
	} else if (socketData?.type === 'customer') {
		await Customer.findOneAndUpdate(
			{
				sockets: socketId
			},
			{
				$pull: {
					sockets: socketId
				}
			},
			{ useFindAndModify: false, timestamps: false }
		);
		return true;
	}
};

export const checkAdminNotifications = async (socketData: any) => {
	let notifications = await Notification.find({
		clear: false,
		userType: 'admin',
		user: socketData.userId
	}).lean();
	return notifications.length;
};

export const checkSellerNotifications = async (socketData: any) => {
	let notifications = await Notification.find({
		clear: false,
		userType: 'seller',
		user: socketData.userId
	}).lean();
	return notifications.length;
};
