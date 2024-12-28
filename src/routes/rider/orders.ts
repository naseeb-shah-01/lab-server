import { Router } from 'express';
import {
	dispatchOrders,
	getOrderById,
	getRiderOrdersByType,
	getRiderOrderForEarnings,
	changeOrderStatusByRider,
	getActiveOrders,
	riderOrderAcceptance
} from '../../controllers/rider/orders';
import { changeOrderStatus, cashSettlement } from '../../controllers/users/orders';
import { createReturnRequest } from '../../controllers/buyer/orders';
const router = Router();

router.get('/active-orders', (req, res) => {
	res.handle(getActiveOrders, [req.getUser()]);
});
router.get('/', (req, res) => {
	res.handle(getRiderOrdersByType, [req.query, req.getUser()], 'list');
});
router.get('/earnings', (req, res) => {
	res.handle(getRiderOrderForEarnings, [req.query, req.getUser()]);
});

router.post('/dispatch/', (req, res) => {
	res.handle(dispatchOrders, [req.body, req.getUser(), false]);
});

router.get('/floatCash', (req, res) => {
	res.handle(cashSettlement, [req.getUser()]);
});
router.post('/acceptance', (req, res) => {
	res.handle(riderOrderAcceptance, [req.body, req.getUser()]);
});

router.get('/:id', (req, res) => {
	res.handle(getOrderById, [req.params.id]);
});

router.put('/:id/status/:status', (req, res) => {
	res.handle(changeOrderStatusByRider, [
		req.params.id,
		req.params.status,
		req.body,
		req.getUser()
	]);
});
router.post('/:id/return-request', (req, res) => {
	res.handle(createReturnRequest, [req.params.id, req.body, req.getUser()]);
});

export default router;
