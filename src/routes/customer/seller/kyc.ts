import { Router } from 'express';
import {
	getSellerKycDetails,
	addBusinessDetails,
	updateBusinessDetails,
	addKycDocument,
	updateKycDocument,
	validateKyc,
	requestForSellerApproval,
	preparePaytmSubscription,
	ifscCodeValidations,
	bankDetails,
	verifyCoupon
} from '../../../controllers/customers/customer';
import { multerValidation } from '../../../middlewares/multer';
const router = Router();

router.get('/', (req, res) => {
	res.handle(getSellerKycDetails, req.getUser());
});

router.post('/bussiness-details', (req, res) => {
	res.handle(addBusinessDetails, [req.body, req.getUser()]);
});

router.put('/bussiness-details', (req, res) => {
	res.handle(updateBusinessDetails, [req.body, req.getUser()]);
});

router.post('/kyc-document', multerValidation(validateKyc), (req, res) => {
	res.handle(addKycDocument, [req.body, req.files, req.getUser()]);
});

router.put('/kyc-document', multerValidation(validateKyc), (req, res) => {
	res.handle(updateKycDocument, [req.body, req.files, req.getUser()]);
});

router.put('/request-for-seller', (req, res) => {
	res.handle(requestForSellerApproval, req.getUser());
});

router.post('/create-subscription', (req, res) => {
	res.handle(preparePaytmSubscription, [req.body, req.getUser()]);
});

router.post('/bank-details', (req, res) => {
	res.handle(bankDetails, [req.body, req.getUser()]);
});

router.get('/seller-ifsc-valaidation', (req, res) => {
	res.handle(ifscCodeValidations, [req.query]);
});

router.get('/verify-coupon', (req, res) => {
	res.handle(verifyCoupon, [req.query]);
});
// router.post('/seller-excel-sheet', (req, res) => {
//     res.handle(checkMerchantList, [req.body]);
// });

export default router;
