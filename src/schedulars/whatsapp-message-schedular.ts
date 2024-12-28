import { CronJob } from 'cron';
import { IScheduleMessage } from '../models/whatsapp/scheduleMessage';
import { model } from 'mongoose';
import { sendScheduledWhatsAppMessage } from '../controllers/webhook/schedulingWhatsapp';

const ScheduledMessage = model<IScheduleMessage>('Whatsapp_msg_queue');

export const jobs: Record<string, CronJob> = {};

export function startWhatsappMessageSchedular() {
	new CronJob('* * * * *', async () => {
		const now = new Date();

		//time 5 minutes from now
		const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

		const messagesToSend = await ScheduledMessage.find({
			$or: [
				{
					sendDate: {
						$gte: now,
						$lt: fiveMinutesFromNow
					},
					sendStatus: 'pending',
					status: 'active'
				},
				{
					sendDate: {
						$lt: now
					},
					sendStatus: 'pending',
					status: 'active'
				}
			]
		});

		for (const message of messagesToSend) {
			if (jobs[message._id]) {
				continue;
			}

			if (message.sendDate <= now) {
				try {
					const sentMsgCount = await sendScheduledWhatsAppMessage(message);
					await ScheduledMessage.updateOne(
						{ _id: message._id },
						{ sendStatus: 'sent', status: 'inactive', sentMsgCount: sentMsgCount }
					);
				} catch (error) {
					console.error(`Failed to send message with ID ${message._id}:`, error);
				}
			} else {
				jobs[message._id] = new CronJob(message.sendDate, async function () {
					try {
						const sentMsgCount = await sendScheduledWhatsAppMessage(message);
						await ScheduledMessage.updateOne(
							{ _id: message._id },
							{ sendStatus: 'sent', status: 'inactive', sentMsgCount: sentMsgCount }
						);

						jobs[message._id].stop();
						delete jobs[message._id];
					} catch (error) {
						console.error(`Failed to send message with ID ${message._id}:`, error);
					}
				});

				jobs[message._id].start();
			}
		}
	}).start();
}
