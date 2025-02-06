import { Router } from 'express';
const router = Router();

import users from './users/users';
import testGroup from "./testGroup"

import fcmNotification from './fcmNotification/fcmNotification';
router.use('/users', users);
router.use('test-group',testGroup)
router.use('/fcm-notification', fcmNotification);


export default router;
