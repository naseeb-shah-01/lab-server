// import { model } from 'mongoose';
// import { CronJob } from 'cron';
// import { IProduct } from '../models/seller/product';

// const Products = model<IProduct>('NewProduct');

// export const startProductStatusUpdater = () => {
// 	new CronJob(
// 		'*/20 * * * * *',
// 		function () {
// 			productStatusUpdateSchedular();
// 		},
// 		null,
// 		true
// 	);
// };

// export const productStatusUpdateSchedular = async () => {
// 	try {
// 		const currTime = new Date();

// 		const products = await Products.find({
// 			temporaryDisabled: true
// 		});

// 		products.forEach(async (product) => {
// 			if (product.disableDuration.tillDate.getDate() == currTime.getDate()) {
// 				if (product.disableDuration.tillTime.getHours() == currTime.getHours()) {
// 					if (product.disableDuration.tillTime.getMinutes() >= currTime.getMinutes()) {
// 						product.temporaryDisabled = false;
// 						product.status = 'active';
// 						await product.save();
// 					}
// 				}
// 			}
// 		});
// 	} catch (e) {}
// };
