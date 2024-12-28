import { CronJob } from 'cron';
import { format } from 'date-fns';
import { model } from 'mongoose';
import { IRider } from '../models/rider/rider';
const Rider = model<IRider>('Rider');
import { updateRiderAvailability } from '../controllers/rider/rider';
export const ridersClosingSchedular = async () => {
	try {
		let riders = await Rider.find();
		new CronJob(
			'* 23 * * *',
			function () {
				for (let i = 0; i < riders.length; i++) {
					if (riders[i].available) {
						updateRiderAvailability(riders[i], false);
					}
				}
			},
			null,
			true
		);
	} catch (error) {}
};
