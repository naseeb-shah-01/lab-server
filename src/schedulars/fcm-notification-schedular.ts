import { CronJob } from 'cron';
// import { IScheduleMessage } from '../models/whatsapp/scheduleMessage';
import { model } from 'mongoose';
import { IScheduleNotification } from '../models/fcmNotification/fcmNotification';
import { sendScheduledNotification } from '../controllers/fcmNotification/fcmNotification';
// import { sendScheduledWhatsAppMessage } from '../controllers/webhook/schedulingWhatsapp';

const ScheduledNotification = model<IScheduleNotification>('fcm_notification_queue');

export const jobs: Record<string, CronJob> = {};

export function startFcmNotificationSchedular() {
	new CronJob('* * * * *', async () => {
		const now = new Date();

		//time 5 minutes from now
		const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

		const notificationToSend = await ScheduledNotification.find({
			$or: [
				{
					sendDate: {
						$gte: now,
						$lt: fiveMinutesFromNow
					},
					sendStatus: 'pending',
					status: 'active',
					sending: { $ne: true } // Exclude notifications that are currently being sent
				},
				{
					sendDate: {
						$lt: now
					},
					sendStatus: 'pending',
					status: 'active',
					sending: { $ne: true } // Exclude notifications that are currently being sent
				}
			]
		});

		for (const notification of notificationToSend) {
			if (jobs[notification._id]) {
				continue;
			}

			// Set the 'sending' flag to true
			await ScheduledNotification.updateOne({ _id: notification._id }, { sending: true });

			if (notification.sendDate <= now) {
				try {
					const sentNotificationCount = await sendScheduledNotification(notification);
					await ScheduledNotification.updateOne(
						{ _id: notification._id },
						{
							sendStatus: 'sent',
							status: 'inactive',
							sentNotificationCount: sentNotificationCount,
							sending: false // Clear the 'sending' flag
						}
					);
				} catch (error) {
					console.error(`Failed to send message with ID ${notification._id}:`, error);
				}
			} else {
				jobs[notification._id] = new CronJob(notification.sendDate, async function () {
					try {
						const sentNotificationCount = await sendScheduledNotification(notification);
						await ScheduledNotification.updateOne(
							{ _id: notification._id },
							{
								sendStatus: 'sent',
								status: 'inactive',
								sentNotificationCount: sentNotificationCount,
								sending: false // Clear the 'sending' flag
							}
						);

						jobs[notification._id].stop();
						delete jobs[notification._id];
					} catch (error) {
						console.error(`Failed to send message with ID ${notification._id}:`, error);
					}
				});

				jobs[notification._id].start();
			}
		}
	}).start();
}
