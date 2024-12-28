import { Router } from 'express';
import {
	createCoupon,
	deleteCoupon,
	editCoupon,
	getAllCoupons,
	getASellerCoupons,
	getCouponById,
	removeSellerFromCoupons,
	updateCouponStatus
} from '../../../controllers/coupons/coupons';
const router = Router();

router.get('/', (req, res) => {
	res.handle(getAllCoupons, [req.query, req.getUser()]);
});

router.post('/createcoupon', (req, res) => {
	res.handle(createCoupon, [req.body, req.getUser()]);
});
router.put('/editcoupon', (req, res) => {
	res.handle(editCoupon, [req.body, req.getUser()]);
});
router.get('/getcoupon/:sellerId', (req, res) => {
	res.handle(getASellerCoupons, [req.params.sellerId, req.getUser()]);
});
router.get('/coupon/:id', (req, res) => {
	res.handle(getCouponById, [req.params.id, req.getUser()]);
});
router.get('removeseller/:sellerId/:couponId', (req, res) => {
	res.handle(removeSellerFromCoupons, [req.params.couponId, req.params.sellerId, req.getUser()]);
});
router.delete('deletecoupon/:couponId', (req, res) => {
	res.handle(deleteCoupon, [req.params.couponId, req.getUser()]);
});

router.put('/:id/:status', (req, res) => {
	res.handle(updateCouponStatus, [req.params.id, req.params.status, req.getUser()]);
});

export default router;
