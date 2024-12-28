import { Router } from 'express';
import {
	acceptOrder,
	dispatchOrders,
	getAloneOrdersForDispatch,
	getGroupOrderDetailsById,
	getGroupOrdersForDispatch,
	getOrderById,
	getOrderForTurnIn,
	getOrdersByType,
	getRunnningOrderDetails,
	readyOrders,
	rejectOrder,
	turnInOrder
} from '../../../controllers/seller/orders';
import { changeOrderStatus } from '../../../controllers/users/orders';
const router = Router();

router.get('/turn-in/:id', (req, res) => {
	res.handle(getOrderForTurnIn, [req.params.id, req.getUser()]);
});

router.put('/turn-in/:id', (req, res) => {
	res.handle(turnInOrder, [req.params.id, req.body, req.getUser()]);
});

router.get('/running', (req, res) => {
	res.handle(getRunnningOrderDetails, [req.getUser()]);
});

router.get('/dispatch/alone', (req, res) => {
	res.handle(getAloneOrdersForDispatch, [req.getUser()]);
});

router.get('/dispatch/group', (req, res) => {
	res.handle(getGroupOrdersForDispatch, [req.getUser()]);
});

router.get('/group/:id', (req, res) => {
	res.handle(getGroupOrderDetailsById, [req.params.id, req.getUser()]);
});

router.post('/dispatch/', (req, res) => {
	res.handle(dispatchOrders, [req.body, req.getUser(), false]);
});
router.post('/ready/', (req, res) => {
	res.handle(readyOrders, [req.body, req.getUser(), false]);
});
router.post('/accept/', (req, res) => {
	res.handle(acceptOrder, [req.body, req.getUser(), false]);
});

router.post('/reject/', (req, res) => {
	res.handle(rejectOrder, [req.body, req.getUser(), false]);
});

router.get('/type/:type', (req, res) => {
	res.handle(getOrdersByType, [req.query, req.params.type, req.getUser()], 'list');
});

router.get('/:id', (req, res) => {
	res.handle(getOrderById, [req.params.id, req.getUser()]);
});

router.put('/:id/status/:status', (req, res) => {
	res.handle(changeOrderStatus, [req.params.id, req.params.status, req.body, req.getUser()]);
});

export default router;
