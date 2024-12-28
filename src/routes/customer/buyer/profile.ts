import { Router } from 'express';
import {
	getCategoryTree,
	getCustomerCategoryIds,
	getSelectedCategories,
	updateCustomerCategories
} from '../../../controllers/categories/customer-categories';
import {
	getAccountSettings,
	getBuyerAddresses,
	getMyProfile,
	updateAccountSettings,
	updateAddresses,
	updateMyProfile
} from '../../../controllers/customers/profile';
import { multerValidation } from '../../../middlewares/multer';
import { getUserReferalCode } from '../../../controllers/customers/referral';

const router = Router();

router.get('/my-profile', (req, res) => {
	res.handle(getMyProfile, [req.getUser()]);
});
router.get('/my-referalcode', (req, res) => {
	res.handle(getUserReferalCode, [req.getUser()]);
});
router.put('/my-profile', (req, res) => {
	res.handle(updateMyProfile, [req.body, req.getUser(), req.session]);
});

router.get('/account-settings', (req, res) => {
	res.handle(getAccountSettings, [req.getUser(), req.query]);
});
router.get('/get-addresses', (req, res) => {
	res.handle(getBuyerAddresses, [req.getUser()]);
});
router.put('/account-settings', (req, res) => {
	res.handle(updateAccountSettings, [req.body, req.getUser(), req.session]);
});

router.put('/addresses', (req, res) => {
	res.handle(updateAddresses, [req.body, req.getUser()]);
});

router.get('/all-categories', (req, res) => {
	res.handle(getCategoryTree);
});

router.get('/selected-categories', (req, res) => {
	res.handle(getSelectedCategories, [req.getUser()]);
});

router.get('/selected-level4', (req, res) => {
	res.handle(getCustomerCategoryIds, req.getUser()._id);
});

router.put('/selected-categories', (req, res) => {
	res.handle(updateCustomerCategories, [req.body, req.getUser(), req.session]);
});

export default router;
