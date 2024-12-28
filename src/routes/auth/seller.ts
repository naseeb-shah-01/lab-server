import { Router } from 'express';
import {
	sendLoginOtp,
	verifyLoginOtp,
	renewUser,
	logoutUser,
	verifyReferralCode,
	sendVerifiedLoginOtp
} from '../../controllers/auth/seller';
import {
	getCategoryTree,
	selectCategoryByCustomer
} from '../../controllers/categories/customer-categories';
import { allLevel1Categories } from '../../controllers/seller/seller';
const router = Router();

router.post('/otp/send', (req, res) => {
	res.handle(sendLoginOtp, [req.body.contact]);
});

router.post('/otp/registered-seller', (req, res) => {
	res.handle(sendVerifiedLoginOtp, [req.body.contact]);
});

router.post('/otp/verify', (req, res) => {
	res.removeHeader('RENEW_USER');
	res.handle(verifyLoginOtp, [req.body, req.session, req.sessionID]);
});

router.get('/referral-code/verify', (req, res) => {
	res.handle(verifyReferralCode, [req.query]);
});

router.get('/renew', (req, res) => {
	res.removeHeader('RENEW_USER');
	res.handle(renewUser, [req.session]);
});

router.get('/categories', (req, res) => {
	res.handle(getCategoryTree, 'list');
});

router.post('/categories', (req, res) => {
	res.handle(selectCategoryByCustomer, [req.body, req.session, req.sessionID]);
});

router.get('/all-level1-categories', (req, res) => {
	res.handle(allLevel1Categories, 'list');
});

router.post('/logout', (req, res) => {
	res.handle(logoutUser, [req.session, req.sessionID, req.body]);
});

export default router;
