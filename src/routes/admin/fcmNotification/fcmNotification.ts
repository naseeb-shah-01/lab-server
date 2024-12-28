import { Router } from 'express';
import { Types, model } from 'mongoose';
import {
	getAllScheduleNotification,
	notificationDetails,
	saveScheduledNotification,
	updateScheduleNotification,
	updateStatus
} from '../../../controllers/fcmNotification/fcmNotification';

const router = Router();

router.post('/save-scheduled-notification', (req, res) => {
	res.handle(saveScheduledNotification, [req.body]);
});
router.get('/get-scheduled-notification', (req, res) => {
	res.handle(getAllScheduleNotification, req.query, 'list');
});
router.put('/update-notification-status/:id/:status', (req, res) => {
	res.handle(updateStatus, [req.params.id, req.params.status]);
});

router.get('/notification-details/:id', (req, res) => {
	res.handle(notificationDetails, [req.params.id]);
});

router.post('/update-scheduled-notification', (req, res) => {
	res.handle(updateScheduleNotification, [req.body]);
});
export default router;
