import { Router } from 'express';
import {
	editBuyer,
	getAllBuyers,
	getBuyerById,
	getCart,
	getWalletHistory,
	updateRewardBalanceByAdmin,
	updateWalletBalanceByAdmin
} from '../../../controllers/buyer/buyer';
const router = Router();

router.get('/', (req, res) => {
	res.handle(getAllBuyers, req.query, 'list');
});
router.get('/:id', (req, res) => {
	res.handle(getBuyerById, [req.params.id]);
});

router.put('/edit-buyer', (req, res) => {
	res.handle(editBuyer, [req.body, req.getUser()]);
});
router.post('/view-cart', (req, res) => {
	res.handle(getCart, [req.body, req.getUser()]);
});
router.get('/wallet-history/:id', (req, res) => {
	res.handle(getWalletHistory, [req.params.id, req.query], 'list');
});
router.post('/update-wallet-amount/:id', (req, res) => {
	res.handle(updateWalletBalanceByAdmin, [req.params.id, req.body]);
});
router.post('/update-reward-amount/:id', (req, res) => {
	res.handle(updateRewardBalanceByAdmin, [req.params.id, req.body]);
});
export default router;
