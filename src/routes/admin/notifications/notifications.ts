import { Router } from 'express';
import {
	clearAllNotificationByType,
	clearNotificationById,
	getAllNotificationsByType,
	getNotificationCounts,
	showMiscellaneousCounts
} from '../../../controllers/notifications/admin-notifications';

const router = Router();

router.get('/counts', (req, res) => {
	res.handle(getNotificationCounts, [req.getUser()]);
});

router.get('/miscellaneous', (req, res) => {
	res.handle(showMiscellaneousCounts, [req.getUser]);
});

router.get('/:type', (req, res) => {
	res.handle(getAllNotificationsByType, [req.params.type, req.query, req.getUser()], 'list');
});

router.put('/type/:type', (req, res) => {
	res.handle(clearAllNotificationByType, [req.params.type, req.getUser()]);
});

router.put('/:id', (req, res) => {
	res.handle(clearNotificationById, [req.params.id, req.getUser()]);
});

export default router;
