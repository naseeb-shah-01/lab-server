import { Router } from 'express';
import {
	addCategory,
	getCategoryTree,
	getCustomerCategoryIds,
	getSelectedCategories,
	getSellerCategoryTree,
	updateCustomerCategories
} from '../../../controllers/categories/customer-categories';
import {
	approveRider,
	getAccountSettings,
	getAllSellerRider,
	getBusinessProfile,
	getMyProfile,
	getSellerRiderDetail,
	// getRiderDetails,
	updateAccountSettings,
	updateBusinessProfile,
	updateMyProfile,
	validateBusinessProfile
} from '../../../controllers/seller/profile';
import {
	getPriceTable,
	getShopTiming,
	updatePriceTable,
	updateShopTiming
} from '../../../controllers/seller/seller';
import { multerValidation } from '../../../middlewares/multer';

const router = Router();
///makes-me
router.get('/rider-profiles', (req, res) => {
	res.handle(getAllSellerRider, [req.getUser(), req.query, 'list']);
});
router.get('/my-profile', (req, res) => {
	res.handle(getMyProfile, [req.getUser()]);
});

router.put('/my-profile', (req, res) => {
	res.handle(updateMyProfile, [req.body, req.getUser(), req.session]);
});

router.get('/business-profile', (req, res) => {
	res.handle(getBusinessProfile, [req.getUser()]);
});

router.put('/business-profile', multerValidation(validateBusinessProfile), (req, res) => {
	res.handle(updateBusinessProfile, [req.body, req.files, req.getUser(), req.session]);
});

router.get('/account-settings', (req, res) => {
	res.handle(getAccountSettings, [req.getUser()]);
});

router.put('/account-settings', (req, res) => {
	res.handle(updateAccountSettings, [req.body, req.getUser(), req.session]);
});

router.get('/price-table', (req, res) => {
	res.handle(getPriceTable, [req.getUser()]);
});

router.put('/price-table', (req, res) => {
	res.handle(updatePriceTable, [req.body, req.getUser()]);
});

router.get('/all-categories', (req, res) => {
	res.handle(getCategoryTree, [req.getUser()]);
});

router.get('/selected-categories', (req, res) => {
	res.handle(getSelectedCategories, [req.getUser()]);
});

router.post('/addCategory', (req, res) => {
	res.handle(addCategory, [req.getUser(), req.body]);
});

router.get('/sellercategorytree', (req, res) => {
	res.handle(getSellerCategoryTree, [req.getUser()]);
});

router.get('/selected-level4', (req, res) => {
	res.handle(getCustomerCategoryIds, req.getUser()._id);
});

router.put('/selected-categories', (req, res) => {
	res.handle(updateCustomerCategories, [req.body, req.getUser(), req.session]);
});

router.get('/shopTimings', (req, res) => {
	res.handle(getShopTiming, [req.getUser()]);
});

router.put('/shopTimings', (req, res) => {
	res.handle(updateShopTiming, [req.body, req.getUser()]);
});
router.put('/approve/:id', (req, res) => {
	res.handle(approveRider, [req.params.id, req.body, req.getUser()]);
});
router.get('/rider-profiles/:id', (req, res) => {
	res.handle(getSellerRiderDetail, [req.params.id]);
});

export default router;
