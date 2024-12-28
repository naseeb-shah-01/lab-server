import { model } from 'mongoose';
import { IOrder } from '../models/order/order';
import { CronJob } from 'cron';

const Order = model<IOrder>('Order');

export const startCancelOrderSchedular = () => {
	cancelStaleOrders();
	new CronJob(
		'0 */35 * * * *',
		function () {
			cancelStaleOrders();
		},
		null,
		true
	);
};

const cancelStaleOrders = async () => {
	try {
		const endTime = new Date(Date.now() - 30 * 60 * 1000);
		const staleOrders = await Order.find({
			paymentMode: { $in: ['online-cod', 'online'] },
			createdAt: { $lt: endTime },
			'onlinePayment.status.status': { $nin: ['completed', 'captured', 'failed'] },
			'statusHistory.status': { $nin: ['placed', 'failed'] }
		});
		for (let order of staleOrders) {
			if (!order.onlinePayment.status.find((st) => st.status === 'failed')) {
				order.onlinePayment.status.push({
					status: 'failed',
					date: new Date(),
					remarks: 'failed via schedular'
				});
				await order.save();
			}
			if (!order.statusHistory.find((st) => st.status === 'failed')) {
				order.currentStatus = {
					status: 'failed',
					date: new Date(),
					remarks: 'failed via schedular'
				};
				order.statusHistory.push(order.currentStatus);
				await order.save();
			}
		}
	} catch (error) {
		console.error('Cancel order error : ', error);
	}
};
