// import { model } from 'mongoose';
// import { Server, Socket } from 'socket.io';
// import {
// 	getBuyerNotificationsCount,
// 	getSellerNotificationsCount
// } from '../controllers/buyer/notifications';
// import { getBasicCart } from '../controllers/customers/cart';
// import {
// 	checkAdminNotifications,
// 	checkSellerNotifications,
// 	connectUserSocket,
// 	disconnectUserSocket
// } from '../controllers/socket';
// import { ICustomer } from '../models/customer/customer';
// import { ISeller } from '../models/customer/seller';
// import { IRider } from '../models/rider/rider';
// import { checkNextOrderRiderAvailable } from '../controllers/customers/order';
// import { getStripText } from './strip-text';
// const Customer = model<ICustomer>('Customer');
// const Seller = model<ISeller>('NewCustomer');
// const Rider = model<IRider>('Rider');

// declare global {
// 	namespace NodeJS {
// 		interface Global {
// 			io: Server;
// 			socket: Socket;
// 		}
// 	}
// }

// export const startSocketServer = (server) => {
// 	const io = new Server(server, {
// 		allowEIO3: true,
// 		allowRequest: (req, fn) => {
// 			fn(null, true);
// 		},
// 		cors: {
// 			origin: true,
// 			credentials: true
// 		}
// 	});
// 	global.io = io;

// 	global.io.on('connection', async (socket: Socket) => {
// 		socket.on('disconnect', async () => {
// 			await disconnectUserSocket(socket.data, socket.id);
// 		});
// 		if (
// 			!socket.handshake.auth ||
// 			!socket.handshake.auth.type ||
// 			!socket.handshake.auth.userId ||
// 			!socket.handshake.auth.session
// 		) {
// 			socket.disconnect(true);
// 		}
// 		const isUserAuthenticated = await connectUserSocket(socket.handshake.auth, socket.id);

// 		if (isUserAuthenticated) {
// 			socket.data = socket.handshake.auth;

// 			if (socket.handshake.auth.type === 'admin') {
// 				let newNotifications = await checkAdminNotifications(socket.data);

// 				if (newNotifications) {
// 					socket.emit(
// 						'newAdminNotification',
// 						newNotifications + ' pending notifications.'
// 					);
// 				}
// 			} else if (socket.handshake.auth.type === 'customer') {
// 				const customer = await Customer.findById(socket.data.userId);
// 				if (customer.status !== 'active') {
// 					socket.emit('accountDisabled', {});
// 				}
// 				const cart = await getBasicCart(socket.data.userId);
// 				socket.emit('cartUpdate', {
// 					cart: cart
// 				});

// 				const buyerNotificationsCount = await getBuyerNotificationsCount(
// 					socket.data.userId
// 				);
// 				socket.emit('buyerNotificationsUpdate', {
// 					count: buyerNotificationsCount
// 				});
// 				const available = await checkNextOrderRiderAvailable();

// 				socket.emit('isDeliveryAvailable', {
// 					available,
// 					text: getStripText()
// 				});
// 			} else if (socket.handshake.auth.type === 'rider') {
// 				const rider = await Rider.findById(socket.data.userId);

// 				if (rider.status !== 'active') {
// 					socket.emit('accountDisabled', {});
// 				}
// 			} else {
// 				const seller = await Seller.findById(socket.data.userId);
// 				if (seller.status !== 'active') {
// 					socket.emit('accountDisabled', {});
// 				}

// 				const sellerNotificationsCount = await getSellerNotificationsCount(
// 					socket.data.userId
// 				);
// 				socket.emit('sellerNotificationsUpdate', {
// 					count: sellerNotificationsCount
// 				});
// 				let newNotifications = await checkSellerNotifications(socket.data);
// 				if (newNotifications) {
// 					socket.emit(
// 						'newSellerNotification',
// 						newNotifications + ' pending notifications.'
// 					);
// 				}
// 			}
// 		} else {
// 			socket.disconnect();
// 		}
// 	});
// };
