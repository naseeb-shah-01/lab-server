import { Router } from 'express';
import { clearSellerNotifications } from '../../../controllers/buyer/notifications';
import { getNotificationsByType } from '../../../controllers/seller/notifications';

const router = Router();

router.get('/type/:type/', (req, res) => {
	res.handle(getNotificationsByType, [req.params.type, req.query, req.getUser()], 'list');
});

router.post('/clear', (req, res) => {
	res.handle(clearSellerNotifications, [req.getUser()]);
});

export default router;
