import { Router } from 'express';
// import {
// 	sendLoginOtp,
// 	verifyLoginOtp,
// 	renewUser,
// 	logoutUser
// } from '../../controllers/auth/customer';
// import {
// 	getCategoryTree,
// 	selectCategoryByCustomer
// } from '../../controllers/categories/customer-categories';
const router = Router();

// router.post('/otp/send', (req, res) => {
// 	res.handle(sendLoginOtp, req.body);
// });

// router.post('/otp/verify', (req, res) => {
// 	res.removeHeader('RENEW_USER');
// 	res.handle(verifyLoginOtp, [req.body, req.session, req.sessionID]);
// });

// router.get('/renew', (req, res) => {
// 	res.removeHeader('RENEW_USER');
// 	res.handle(renewUser, [req.session]);
// });

// router.get('/categories', (req, res) => {
// 	res.handle(getCategoryTree, 'list');
// });

// router.post('/categories', (req, res) => {
// 	res.handle(selectCategoryByCustomer, [req.body, req.session, req.sessionID]);
// });

// router.post('/logout', (req, res) => {
// 	res.handle(logoutUser, [req.session, req.sessionID, req.body]);
// });

export default router;
