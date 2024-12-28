import { Router } from 'express';
import { getOrderById } from '../../../controllers/buyer/orders';
import {
	adminDispatch,
	changeOrderStatus,
	getAllOrders,
	getGroupOrderById,
	getOrdersCounts,
	reAssignRider,
	refundOrder
	// sellerDispatch
} from '../../../controllers/users/orders';
const router = Router();

router.get('/counts', (req, res) => {
	res.handle(getOrdersCounts);
});

router.get('/status/:status', (req, res) => {
	res.handle(getAllOrders, [req.params.status, req.query], 'list');
});

router.get('/group-order/:id', (req, res) => {
	res.handle(getGroupOrderById, [req.params.id]);
});

router.put('/re-assign-rider', (req, res) => {
	res.handle(reAssignRider, [req.body, req.getUser()]);
});

router.get('/:id', (req, res) => {
	res.handle(getOrderById, [req.params.id]);
});

router.put('/:id/refund', (req, res) => {
	res.handle(refundOrder, [req.params.id, req.body, req.getUser()]);
});

// router.put('/:id/seller-dispatch', (req, res) => {
// 	res.handle(sellerDispatch, [req.params.id, req.body, req.getUser()]);
// });

router.put('/:id/dispatch', (req, res) => {
	res.handle(adminDispatch, [req.params.id, req.body, req.getUser()]);
});

router.put('/:id/status/:status', (req, res) => {
	res.handle(changeOrderStatus, [
		req.params.id,
		req.params.status,
		req.body,
		{
			_id: '63d510a06941561eacb5b0c8'
		}
	]);
});

export default router;
