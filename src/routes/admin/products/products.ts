import { Router } from 'express';
import {
	deleteProduct,
	getProductById,
	updateProductStatus,
	getAllProducts,
	bulkUpdateProduct,
	updateSellerProductStatus,
	updateSellerPrice,
	getAllSpecifications,
	removePromotionProduct,
	setPromotionOfProduct,
	getFeaturedProducts,
	updateFeaturedStatus
} from '../../../controllers/customers/admin-customer';
import { addProduct, updateProduct, validateProduct } from '../../../controllers/seller/seller';
import { multerValidation } from '../../../middlewares/multer';
const router = Router();

router.get('/', (req, res) => {
	res.handle(getAllProducts, [req.query], 'list');
});

router.get('/:id', (req, res) => {
	res.handle(getProductById, [req.params.id]);
});

router.delete('/:id', (req, res) => {
	res.handle(deleteProduct, [req.params.id, req.getUser()]);
});

router.put('/bulk-update-product/:id', (req, res) => {
	res.handle(bulkUpdateProduct, [req.params.id, req.body, req.getUser()]);
});

router.put('/update-product/:id', multerValidation(validateProduct), (req, res) => {
	res.handle(updateProduct, [req.params.id, req.body, req.files, req.getUser()]);
});

router.post('/add-product', multerValidation(validateProduct), (req, res) => {
	res.handle(addProduct, [req.body, req.files, { _id: req.body._id }]);
});

router.put('/:id/status/:status', (req, res) => {
	res.handle(updateProductStatus, [req.params.id, req.params.status, req.body, req.getUser()]);
});

router.put('/:id/:sellerId/status/:status', (req, res) => {
	res.handle(updateSellerProductStatus, [req.params.id, req.params.status, req.params.sellerId]);
});

router.put('/update-price/:id', (req, res) => {
	res.handle(updateSellerPrice, [req.params.id, req.body]);
});

router.post('/all-specifications', (req, res) => {
	res.handle(getAllSpecifications, [req.body, req.getUser()]);
});
// old  refer to platform products

router.get('/old/', (req, res) => {});

router.get('/old/:id', (req, res) => {
	res.handle(getProductById, [req.params.id]);
});

router.delete('/old/:id', (req, res) => {
	res.handle(deleteProduct, [req.params.id, req.getUser()]);
});

router.put('/old/bulk-update-product/:id', (req, res) => {
	res.handle(bulkUpdateProduct, [req.params.id, req.body, req.getUser()]);
});

router.put('/old/update-product/:id', multerValidation(validateProduct), (req, res) => {
	res.handle(updateProduct, [req.params.id, req.body, req.files, req.getUser()]);
});

router.post('/old/add-product', multerValidation(validateProduct), (req, res) => {
	res.handle(addProduct, [req.body, req.files, { _id: req.body._id }]);
});

router.put('old/:id/status/:status', (req, res) => {
	res.handle(updateProductStatus, [req.params.id, req.params.status, req.body, req.getUser()]);
});

router.put('old/:id/:sellerId/status/:status', (req, res) => {
	res.handle(updateSellerProductStatus, [req.params.id, req.params.status, req.params.sellerId]);
});

router.put('old/update-price/:id', (req, res) => {
	res.handle(updateSellerPrice, [req.params.id, req.body]);
});

router.post('old/all-specifications', (req, res) => {
	res.handle(getAllSpecifications, [req.body, req.getUser()]);
});

router.post('/add-feature-products', (req, res) => {
	res.handle(setPromotionOfProduct, [req.body]);
});
router.post('/remove-feature-products', (req, res) => {
	res.handle(removePromotionProduct, [req.body]);
});
router.post('/get-feature-products', (req, res) => {
	res.handle(getFeaturedProducts, [req.body]);
});
router.put('/featured', (req, res) => {
	res.handle(updateFeaturedStatus, [req.body]);
});

export default router;
