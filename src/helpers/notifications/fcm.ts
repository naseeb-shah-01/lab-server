import * as admin from 'firebase-admin';
let firebaseCredentials = null;
let sellerFirebaseCredentials = null;
let riderFirebaseCredentials = null;
let consumerFirebaseInstance;
let sellerFirebaseInstance;
let riderFirebaseInstance;

try {
	firebaseCredentials = require('../../../firebase-credentials.json');
} catch (error) {
	console.error('No firebase Credentials found. Please create one.');
}

try {
	sellerFirebaseCredentials = require('../../../seller-firebase-credentials.json');
} catch (error) {
	console.error('No firebase Credentials found for seller app. Please create one.');
}

try {
	riderFirebaseCredentials = require('../../../rider-firebase-credentials.json');
} catch (error) {
	console.error('No firebase Credentials found for rider app. Please create one.');
}

export const initializeFirebase = async () => {
	if (firebaseCredentials) {
		consumerFirebaseInstance = admin.initializeApp(
			{
				credential: admin.credential.cert(firebaseCredentials)
			},
			'consumer'
		);
	}
	if (sellerFirebaseCredentials) {
		sellerFirebaseInstance = admin.initializeApp(
			{
				credential: admin.credential.cert(sellerFirebaseCredentials)
			},
			'seller'
		);
	}
	if (riderFirebaseCredentials) {
		riderFirebaseInstance = admin.initializeApp(
			{
				credential: admin.credential.cert(riderFirebaseCredentials)
			},
			'rider'
		);
	}
};

export const sendFCMNotification = async (notification, fcmTokens = []) => {
	try {
		let payload = {
			notification: {
				body: notification.message,
				sound: 'default'
			},
			data: {
				data: JSON.stringify({
					...(notification.data || {}),
					type: notification.type,
					userType: notification.userType
				})
			}
		};
		return consumerFirebaseInstance
			.messaging()
			.sendToDevice(fcmTokens, payload, { priority: 'high' })
			.then((response) => {})
			.catch((error) => {
				console.error('Error sending fcm message: ', error);
			});
	} catch (error) {
		console.error('Error sending fcm message: ', error);
	}
};

export const sendSellerFCMNotification = async (notification, fcmTokens = []) => {
	try {
		let payload = {
			notification: {
				body: notification.message,
				sound: notification.sound ?? 'default',
				...(notification.android_channel_id
					? { android_channel_id: notification.android_channel_id }
					: {})
			},
			data: {
				data: JSON.stringify({
					...(notification.data || {}),
					type: notification.type,
					userType: notification.userType
				})
			}
		};
		return sellerFirebaseInstance
			.messaging()
			.sendToDevice(fcmTokens, payload, { priority: 'high' })
			.then((response) => {})
			.catch((error) => {
				console.error('Error sending fcm message: ', error);
			});
	} catch (error) {
		console.error('Error sending fcm message: ', error);
	}
};

export const sendRiderFCMNotification = async (notification, fcmTokens = []) => {
	try {
		let payload = {
			notification: {
				body: notification.message,
				sound: 'default',
				...(notification.android_channel_id
					? { android_channel_id: notification.android_channel_id }
					: {})
			},
			data: {
				data: JSON.stringify({
					...(notification.data || {}),
					type: notification.type,
					userType: notification.userType
				})
			}
		};
		return riderFirebaseInstance
			.messaging()
			.sendToDevice(fcmTokens, payload, { priority: 'high' })
			.then((response) => {})
			.catch((error) => {
				console.error('Error sending fcm message: ', error);
			});
	} catch (error) {
		console.error('Error sending fcm message: ', error);
	}
};

export async function sendPushNotification(notification, fcmTokens) {
	try {
		const payload = {
			notification: {
				title: notification.title,
				body: notification.message,
				image: notification.image,
				sound: 'default'
			},
			data: {
				data: JSON.stringify({
					...(notification.data || {}),
					type: notification.type,
					userType: notification.userType
				})
			}
		};

		// Send the FCM message to the specified tokens
		const response = await consumerFirebaseInstance
			.messaging()
			.sendToDevice(fcmTokens, payload, { priority: 'high' });

		return response;
	} catch (error) {
		console.error('Error sending FCM notification:', error);
		throw error;
	}
}

export async function sendPersonalizeNotification(productName, buyerName, buyerFCM, seller) {
	try {
		const payload = {
			notification: {
				title: buyerName ? `Hey ${buyerName}!` : 'Hey there!',
				body: `Your ${productName}...and more items are patiently waiting in your cart. Grab them before they're gone and complete your purchase today. Happy shopping with us!`,
				sound: 'default'
			},
			data: {
				data: JSON.stringify({
					...({ sellerId: seller } || {}),
					type: 'BUYER_SELLER_DETAILS',
					userType: 'buyer'
				})
			}
		};

		// Send the FCM message to the specified tokens
		const response = await consumerFirebaseInstance
			.messaging()
			.sendToDevice(buyerFCM, payload, { priority: 'high' });

		return response;
	} catch (error) {
		console.error('Error sending FCM Personalize notification:');
	}
}
