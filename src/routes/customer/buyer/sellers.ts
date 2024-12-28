import { Router } from 'express';
import {
	getAllSellers,
	getParentCategory,
	getProductsByCategory,
	getSellersByLocation,
	getSellersByStatus,
	getSubCategories,
	getSellersByLocationCoordinates
} from '../../../controllers/buyer/seller';

import {
	getActiveCategoryTree,
	getSellerDetails,
	getSellerRunningItems
} from '../../../controllers/categories/customer-categories';
import { getRiderAvailablity } from '../../../controllers/customers/order';

const router = Router();

router.get('/status/:status', (req, res) => {
	res.handle(getSellersByStatus, [req.params.status, req.query, req.getUser()], 'list');
});

router.post('/status', (req, res) => {
	res.handle(getAllSellers, [req.query, req.body, req.getUser()], 'list');
});

router.get('/locationCoordinates', (req, res) => {
	res.handle(getSellersByLocationCoordinates, [req.query, req.getUser()]);
});

router.get('/:id/inventory', (req, res) => {
	res.handle(getParentCategory, [req.params.id, req.getUser()]);
});

router.get('/:id/sellerCategoryTree', (req, res) => {
	res.handle(getActiveCategoryTree, [req.params.id, req?.query]);
});

router.get('/:id/inventory/sub-category', (req, res) => {
	res.handle(getSubCategories, [req.params.id]);
});

router.post('/:id/inventory/product', (req, res) => {
	res.handle(getProductsByCategory, [req.params.id, req.body, req.query, req.getUser()], 'list');
});

router.get('/:id', (req, res) => {
	res.handle(getSellerDetails, [req.params.id, req.getUser(), req.query]);
});

router.get('/:id/running-items', (req, res) => {
	res.handle(getSellerRunningItems, [req.params.id, req.getUser()]);
});

router.get('/location/:id', (req, res) => {
	res.handle(getSellersByLocation, [req.params.id, req.query, req.getUser()], 'list');
});
// this route is used to  Enable/Disable  shop delivery option in checkout Screen
router.get('/rider-availability/:sellerId', (req, res) => {
	res.handle(getRiderAvailablity, [req.params.sellerId]);
});

export default router;
