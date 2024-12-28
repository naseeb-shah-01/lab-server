// import { CronJob } from 'cron';
// import { format } from 'date-fns';
// import { paytm_Transaction_Settlement } from '../helpers/paytmSettlement';
// import { IOrder } from '../models/order/order';
// import { model } from 'mongoose';

// const Order = model<IOrder>('Order');
// export const paytmSettlementScheduler = async () => {
// 	new CronJob(
// 		'* 13 * * *',
// 		async function () {
// 			var date = format(new Date(), 'yyyy-MM-dd');
// 			await settlementresponse(date);
// 		},
// 		null,
// 		true
// 	);
// };

// const settlementresponse = async (date) => {
// 	try {
// 		let prevDate = (new Date(date) as any) - 100000000;
// 		let startDate = format(prevDate, 'yyyy-MM-dd'); //changed current date to yesterday's date
// 		let endDate = date;
// 		let paytmPreviousPayments = await Order.find(
// 			{
// 				createdAt: { $gte: new Date(startDate), $lt: new Date(endDate) }
// 			},
// 			{
// 				paymentMode: 'online'
// 			}
// 		);
// 		let paymentOfOnlineCod = await Order.find(
// 			{
// 				createdAt: { $gte: new Date(startDate), $lt: new Date(endDate) }
// 			},
// 			{
// 				paymentMode: 'online-cod'
// 			}
// 		);
// 		let pageNum =
// 			paymentOfOnlineCod.length > 0
// 				? Math.ceil((paytmPreviousPayments.length + paymentOfOnlineCod.length) / 20)
// 				: Math.ceil(paytmPreviousPayments.length / 20);
// 		for (let i = 1; i <= pageNum; i++) {
// 			await paytm_Transaction_Settlement(startDate, endDate, i.toString(), '20');
// 		}
// 	} catch (error) {}
// };
