import { Router } from 'express';
const router = Router();

import users from './users/users';
import categories from './categories/categories';
import seller from './seller/seller';
import buyer from './customer/customer';
import riders from './riders/riders';
import notifications from './notifications/notifications';
import products from './products/products';
import orders from './orders/orders';
import invoices from './orders/invoices';
import dashboard from './dashboard/dashboard';
import coupons from './coupons/coupons';
import fcmNotification from './fcmNotification/fcmNotification';
router.use('/users', users);
router.use('/categories', categories);
router.use('/seller', seller);
router.use('/buyer', buyer);
router.use('/rider', riders);
router.use('/notifications', notifications);
router.use('/products', products);
router.use('/orders', orders);
router.use('/invoices', invoices);
router.use('/dashboard', dashboard);
router.use('/fcm-notification', fcmNotification);
router.use('/coupons', coupons);

export default router;
