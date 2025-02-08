import { Router } from 'express';
const router = Router();

import users from './users/users';
import testGroup from "./testGroup"
import test from "./test"
import lab from "./lab"
import doctor from "./doctor"
import patient from "./patient"
import report from "./reports"
import fcmNotification from './fcmNotification/fcmNotification';
router.use('/users', users);
router.use('/test-group',testGroup)
router.use("/test",test)
router.use("/lab",lab)
router.use("/doctor",doctor)
router.use("/patient",patient)
router.use("/report",report)
router.use('/fcm-notification', fcmNotification);


export default router;
