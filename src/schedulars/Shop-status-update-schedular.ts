import { model } from 'mongoose';
import { CronJob } from 'cron';
import { ISeller } from '../models/customer/seller';
import { IRider } from '../models/rider/rider';
import { IOrder } from '../models/order/order';

const Seller = model<ISeller>('NewCustomer');
const Rider = model<IRider>('Rider');

export const startShopStatusUpdateSchedular = () => {
	statusUpdateSchedular();
	new CronJob(
		'*/30 * * * *',
		function () {
			statusUpdateSchedular();
			removeOrders();
		},
		null,
		true
	);
};

export const statusUpdateSchedular = async () => {
	try {
		const curr = new Date();
		const sellerShops = await Seller.find(
			{ approved: true },
			{ shopStatus: 1, shopTiming: 1, schedulerInactiveTime: 1 }
		);
		const getDiff = (time) =>
			(parseInt(time.split(':')[0]) - curr.getHours()) * 60 +
			(parseInt(time.split(':')[1]) - curr.getMinutes());
		for (let shop of sellerShops) {
			if (curr < shop.schedulerInactiveTime) continue;
			shop.shopStatus = 'closed';
			let day = curr.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
			try {
				for (let i = 0; shop.shopTiming && i < shop.shopTiming[day].length; i++) {
					let startTime = shop.shopTiming[day][i].startTime;
					let endTime = shop.shopTiming[day][i].endTime;
					let afterStart = getDiff(startTime) <= 0;
					let withinRange = afterStart && getDiff(endTime) >= 0;
					//let nextTimer = withinRange ? endTime : (afterStart ? shops.shopTiming[Object.keys(shops.shopTiming)[(currTime.getDay()+1)%7]].startTime : startTime )
					if (withinRange) {
						shop.shopStatus = 'open';
						break;
					}
				}
				await shop.save();
			} catch (e) {}
		}
	} catch (e) {}
};

// remove orders if delivred or updated
export const removeOrders = async () => {
	try {
		let riders = await Rider.find({
			activeOrders: { $not: { $size: 0 } }
		})
			.select('activeOrders')
			.populate('activeOrders');

		for (let rider of riders) {
			let completedOrders = rider.activeOrders.filter(
				(e: IOrder) => e.delivered.status || e.returned.status || e.rejected.status
			);
			completedOrders = completedOrders.map((e: any) => e._id.toString());

			let uncompletedOrders = rider.activeOrders.filter(
				(e: any) => !completedOrders.includes(e._id.toString())
			);
			uncompletedOrders = uncompletedOrders.map((e: any) => e._id);
			const updatedRider = await Rider.findOneAndUpdate(
				{ _id: rider._id },
				{
					$set: {
						activeOrders: uncompletedOrders
					}
				}
			);
		}
	} catch (e) {
		console.error(e);
	}
};
