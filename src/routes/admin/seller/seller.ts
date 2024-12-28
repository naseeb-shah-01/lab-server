import { Router } from 'express';
import { getSubCategoriesList } from '../../../controllers/categories/categories';
import { getSelectedCategories } from '../../../controllers/categories/customer-categories';
import {
	getSellers,
	getApprovalSeller,
	getPendingCustomer,
	getCustomerById,
	getCustomerSelectedCategory,
	updateStatusCustomer,
	approveCustomer,
	validateKyc,
	updateKycDocument,
	updatePriceTable,
	getTopCategory,
	getSubCategories,
	getProductListByStatus,
	getProductsByCategoryAndLevel,
	getCategoryById,
	updateSellerShopStatus,
	getAllCategories,
	addVersionMetadata,
	getAllVersions,
	getVersionApp,
	getSelectedVersion,
	getBannerImages,
	editVersionMetadata,
	updateSellerPresnolDetails,
	updateSellerBeneficiary,
	updateShopPhotos,
	getSellerCategory,
	reorderLevel2Categories,
	updateFeaturedSeller,
	updatePremiumSeller
} from '../../../controllers/customers/admin-customer';
import { multerExcelValidation, multerValidation } from '../../../middlewares/multer';
import { bulkUpload, updateShopTiming } from '../../../controllers/seller/seller';
import { validateSeller } from '../../../controllers/seller/profile';
const router = Router();

router.get('/', (req, res) => {
	res.handle(getSellers, req.query, 'list');
});

router.get('/approval', (req, res) => {
	res.handle(getApprovalSeller, req.query, 'list');
});

router.get('/pending', (req, res) => {
	res.handle(getPendingCustomer, req.query, 'list');
});

router.get('/versions', (req, res) => {
	res.handle(getAllVersions);
});

router.post('/seller-presnol-detail', (req, res) => {
	res.handle(updateSellerPresnolDetails, [req.body, req.getUser()]);
});
router.put('/shop-photos', multerValidation(validateSeller), (req, res) => {
	res.handle(updateShopPhotos, [req.body, req.files]);
});

router.post('/selected-version', (req, res) => {
	res.handle(getVersionApp, [req.body]);
});

router.get('/selected-category/:id', (req, res) => {
	res.handle(getCustomerSelectedCategory, req.params.id);
});

router.post('/get-version', (req, res) => {
	res.handle(getSelectedVersion, [req.body.version, req.body.app]);
});

router.post('/add-metadata', (req, res) => {
	res.handle(addVersionMetadata, [req.body.version, req.body.app, req.body]);
});

router.put('/edit-metadata', (req, res) => {
	res.handle(editVersionMetadata, [req.body.version, req.body.app, req.body]);
});

router.post('/get-banners', (req, res) => {
	res.handle(getBannerImages, [req.body.version, req.body.app]);
});

router.post('/upload-product-excel', multerExcelValidation.single('file'), (req, res) => {
	res.handle(bulkUpload, [req]);
});

router.get('/seller-category/:id', (req, res) => {
	res.handle(getSellerCategory, [req.params.id, req.query, 'list']);
});

router.put('/reorder', (req, res) => {
	res.handle(reorderLevel2Categories, [req.body]);
});

router.post('/all-categories', (req, res) => {
	res.handle(getAllCategories);
});

router.get('/:id/inventory', (req, res) => {
	res.handle(getTopCategory, req.params.id);
});

router.get('/:id/inventory/category/:category', (req, res) => {
	res.handle(getCategoryById, req.params.category);
});

router.get('/:id/inventory/level/:level/parent/:parent', (req, res) => {
	res.handle(getSubCategories, [req.params.id, req.params.level, req.params.parent]);
});
router.post('/:id', (req, res) => {
	res.handle(getCustomerById, [req.params.id, req.body]);
});

router.get('/:id/inventory/products/category/:level/:category', (req, res) => {
	res.handle(
		getProductsByCategoryAndLevel,
		[req.params.level, req.params.category, req.params.id, req.query],
		'list'
	);
});

router.get('/:id/inventory/:type', (req, res) => {
	res.handle(getProductListByStatus, [req.query, req.params.id, req.params.type], 'list');
});

router.put('/:id/status/:status', (req, res) => {
	res.handle(updateStatusCustomer, [req.params.id, req.params.status, req.getUser()]);
});

router.put('/:id/approve/:status', (req, res) => {
	res.handle(approveCustomer, [req.params.id, req.params.status, req.getUser()]);
});

router.put('/:id/beneficiary/:status', (req, res) => {
	res.handle(updateSellerBeneficiary, [req.params.id, req.params.status, req.getUser()]);
});

router.put('/:id/featured/:status', (req, res) => {
	res.handle(updateFeaturedSeller, [req.params.id, req.params.status, req.getUser()]);
});
router.put('/:id/premium/:status', (req, res) => {
	res.handle(updatePremiumSeller, [req.params.id, req.params.status, req.getUser()]);
});

router.put('/shop/:status', (req, res) => {
	res.handle(updateSellerShopStatus, [req.params.status, req.body.user]);
});

router.put('/:id/kyc-document', multerValidation(validateKyc), (req, res) => {
	res.handle(updateKycDocument, [req.params.id, req.body, req.files, req.getUser()]);
});

router.put('/:id/price-table', (req, res) => {
	res.handle(updatePriceTable, [req.params.id, req.body, req.getUser()]);
});

router.post('/selected-categories', (req, res) => {
	res.handle(getSelectedCategories, [req.body]);
});

router.put('/shopTimings', (req, res) => {
	res.handle(updateShopTiming, [req.body, req.body.user]);
});

router.post('/:id', (req, res) => {
	res.handle(getCustomerById, [req.params.id, req.body]);
});
router.get('/seller-parent-categories/:id', (req, res) => {});

export default router;
