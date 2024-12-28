import { IRider } from '../models/rider/rider';
import { model } from 'mongoose';
import { IOrder } from '../models/order/order';
const Rider = model<IRider>('Rider');
const Order = model<IOrder>('Order');
export const removeOrders = async (order: IOrder) => {
	try {
		let rider = await Rider.findById(order.rider);
		let filteredArray = rider.activeOrders.filter(
			(el) => el.toString() != order._id.toString()
		);

		rider.activeOrders = filteredArray;
		await rider.save();
		return filteredArray;
	} catch (error) {
		console.error;
	}
};
