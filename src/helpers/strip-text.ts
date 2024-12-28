import { addDays, setHours, setMinutes } from 'date-fns';

const { isWithinInterval, addHours, format } = require('date-fns');

export const getStripText = () => {
	try {
		const now = new Date();
		const lunchStartTime = setHours(setMinutes(now, 30), 14); // Set start time to 2:00 PM
		const lunchEndTime = addHours(lunchStartTime, 1); // 3 pm end lunch time
		const nightStartTime = setHours(setMinutes(now, 30), 21);

		// Set start time to 9:30 PM today
		const nightEndTime = setHours(setMinutes(addDays(nightStartTime, 1), 0), 9);

		if (isWithinInterval(now, { start: lunchStartTime, end: lunchEndTime })) {
			const deliveryTime = lunchEndTime; // Adding 1 hour to the end time
			const formattedDeliveryTime = format(deliveryTime, 'h:mm a');

			return `You can start placing orders from  ${formattedDeliveryTime} onwards.`;
		} else if (isWithinInterval(now, { start: nightStartTime, end: nightEndTime })) {
			const deliveryTime = nightEndTime;
			const formattedDeliveryTime = format(deliveryTime, 'h:mm a');

			return `Delivery available tomorrow at ${formattedDeliveryTime}`;
		} else {
			return 'Oh no! Due to high demand, delivery is currently unavailable. Please try again later.';
		}
	} catch (e) {
		console.error(e);
	}
};
