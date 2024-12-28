import { Router } from 'express';
import {
	deleteAccount,
	getRiderLocation,
	updateRiderAvailability,
	updateRiderLocation,
	RiderSalary,
	RiderMonthlySettlement,
	getRiderEarningsAndAttendance
} from '../../controllers/rider/rider';
import { getAllSellers } from '../../controllers/seller/seller';
import riderKyc from './rider-kyc';
import profile from './profile';
import orders from './orders';

const router = Router();

router.use('/rider-kyc', riderKyc);
router.use('/profile', profile);
router.use('/orders', orders);

router.put('/location', (req, res) => {
	res.handle(updateRiderLocation, [req.getUser(), req.body]);
});
router.get('/monthlySettlement', (req, res) => {
	res.handle(RiderMonthlySettlement, [req.query, req.getUser()]);
});
router.delete('/', (req, res) => {
	res.handle(deleteAccount, [req.getUser()]);
});

router.get('/all', (req, res) => {
	res.handle(getAllSellers, [req.getUser()]);
});

router.get('/salary', (req, res) => {
	res.handle(RiderSalary, [req.query.id, req.query.offset]);
});

router.get('/earnings/:id', (req, res) => {
	res.handle(getRiderEarningsAndAttendance, [req.params.id]);
});
router.get('/:id', (req, res) => {
	res.handle(getRiderLocation, [req.params.id]);
});
router.get('/available/:status', (req, res) => {
	res.handle(updateRiderAvailability, [req.getUser(), req.params.status]);
});

export default router;
