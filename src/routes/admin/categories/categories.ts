import { Router } from 'express';
import {
	addCategory,
	updateCategory,
	getCategoriesByLevel,
	getCategoryById,
	getSubCategoriesList,
	updateStatusByCategoryId,
	validateCategory,
	addSpecification,
	updateSpecification,
	getSpecificationById,
	getSpecificationByCategoryId,
	updateStatusBySpecificationId,
	getAllCategoriesByLevel,
	addSpecificationValue,
	updateSpecificationValue,
	getSpecificationValueById,
	getSpecificationIdBySpecificationValues,
	updateStatusBySpecificationValueId,
	reorderCategories,
	reorderSpecification,
	reOrderSpecificationValue,
	getAllSpecificationByCategory,
	deleteCategory,
	deleteSpecification,
	deleteSpecificationValue,
	getAllLevel4Categories
} from '../../../controllers/categories/categories';

import { multerValidation } from '../../../middlewares/multer';
const router = Router();

router.get('/levels/:level', (req, res) => {
	res.handle(getCategoriesByLevel, [req.params.level, req.query], 'list');
});

router.get('/levels/:level/categoriesId/:id', (req, res) => {
	res.handle(getSubCategoriesList, [req.params.level, req.params.id, req.query], 'list');
});

router.get('/:id', (req, res) => {
	res.handle(getCategoryById, req.params.id);
});

router.post('/', multerValidation(validateCategory), (req, res) => {
	res.handle(addCategory, [req.body, req.files, req.getUser()]);
});

router.put('/reorder', (req, res) => {
	res.handle(reorderCategories, [req.body, req.getUser()]);
});

router.put('/:id', multerValidation(validateCategory), (req, res) => {
	res.handle(updateCategory, [req.params.id, req.body, req.files, req.getUser()]);
});

router.delete('/:id', (req, res) => {
	res.handle(deleteCategory, [req.params.id, req.getUser()]);
});

router.put('/:id/status/:status', (req, res) => {
	res.handle(updateStatusByCategoryId, [req.params.id, req.params.status], req.getUser());
});

router.get('/levels/:level/all', (req, res) => {
	res.handle(getAllCategoriesByLevel, [req.params.level, req.query], 'list');
});

router.get('/specification/categoryId/:id', (req, res) => {
	res.handle(getSpecificationByCategoryId, [req.params.id, req.query], 'list');
});

router.get('/specification/:id', (req, res) => {
	res.handle(getSpecificationById, req.params.id);
});

router.post('/specification', (req, res) => {
	res.handle(addSpecification, [req.body, req.getUser()]);
});

router.put('/specification/reorder', (req, res) => {
	res.handle(reorderSpecification, [req.body, req.getUser()]);
});

router.put('/specification/:id', (req, res) => {
	res.handle(updateSpecification, [req.params.id, req.body, req.getUser()]);
});

router.delete('/specification/:id', (req, res) => {
	res.handle(deleteSpecification, [req.params.id, req.getUser()]);
});

router.put('/specification/:id/status/:status', (req, res) => {
	res.handle(updateStatusBySpecificationId, [req.params.id, req.params.status], req.getUser());
});

router.get('/specifications/:id/specification-values', (req, res) => {
	res.handle(getSpecificationIdBySpecificationValues, req.params.id, 'list');
});

router.get('/specification-value/:id', (req, res) => {
	res.handle(getSpecificationValueById, req.params.id);
});

router.post('/specification-value', (req, res) => {
	res.handle(addSpecificationValue, [req.body, req.getUser()]);
});

router.put('/specification-value/reorder', (req, res) => {
	res.handle(reOrderSpecificationValue, [req.body, req.getUser()]);
});

router.put('/specification-value/:id', (req, res) => {
	res.handle(updateSpecificationValue, [req.params.id, req.body, req.getUser()]);
});

router.delete('/specification-value/:id', (req, res) => {
	res.handle(deleteSpecificationValue, [req.params.id, req.getUser()]);
});

router.put('/specification-value/:id/status/:status', (req, res) => {
	res.handle(
		updateStatusBySpecificationValueId,
		[req.params.id, req.params.status],
		req.getUser()
	);
});

router.get('/specification/categoriesId/:id/all', (req, res) => {
	res.handle(getAllSpecificationByCategory, [req.params.id], 'list');
});

router.get('/level/4', (req, res) => {
	res.handle(getAllLevel4Categories);
});

export default router;
