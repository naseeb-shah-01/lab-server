import { Router } from 'express';
import {
	getParentCategory,
	getSubcategory,
	addProduct,
	validateProduct,
	updateProduct,
	changeProductStatus,
	getAllCategories,
	getProductById,
	deleteProduct,
	getAllSpecifications,
	getProductByCategoryAndLevel,
	// getProductBySubCategoryAndLevel,
	getDisabledProducts,
	searchProducts,
	updatePrice,
	updateShopStatus,
	getOutOfStockProducts,
	deleteAccount,
	uploadContacts,
	confirmRider,
	getRider,
	updateDisableStatus,
	bulkUpload,
	getCategoryForSuggestions,
	updateCategoryName
} from '../../../controllers/seller/seller';
import { multerValidation } from '../../../middlewares/multer';
import kyc from './kyc';
import profile from './profile';
import notifications from './notifications';
import invoices from './invoices';
import orders from './orders';
import mou from './MOU';
import { getAllProducts } from '../../../controllers/customers/admin-customer';
import { getCategoriesAccordingParentCategory } from '../../../controllers/categories/categories';
import {
	deleteSellerCategory,
	getSelectedCategories,
	getSellerCategoryTree,
	updateSellerCategories
} from '../../../controllers/categories/customer-categories';

import { multerExcelValidation } from '../../../middlewares/multer';
import { getSellerStats, getChartData } from '../../../controllers/seller/stats';
import { disableOrderRejectedProducts, forceDisable, storeTimings } from './disable';
import {
	getScheduleOfCategories,
	getScheduleOfProducts,
	removeDailyAndWeeklySchedule,
	removeManuallySchedule
} from './disable';
import {
	findOrder,
	sellerInvoices,
	sellerProductExcel
} from '../../../controllers/general/settlement';
import * as XLSX from 'xlsx';

const fs = require('fs');

const router = Router();
router.use('/kyc', kyc);
router.use('/profile', profile);
router.use('/notifications', notifications);
router.use('/invoices', invoices);
router.use('/orders', orders);
router.use('/mou', mou);

// router.post('/seller-settlements', (req, res) => {
// 	res.handle(sellerSettlements, [req.body]);
// });
//Settlementsi-Api

router.post('/seller-invoice', (req, res) => {
	//startDate , endDate
	res.handle(sellerInvoices, [req.body, req.getUser()]);
});
//req.body =means client se data liya and it will send to sellerInvoice

router.post('/findorder', (req, res) => {
	res.handle(findOrder, [req.body, req.getUser()]);
});

router.get('/getcateaccordingparentcate/:seller/:id/:level', (req, res) => {
	res.handle(getCategoriesAccordingParentCategory, [
		req.params.id,
		req.params.level,
		req.params.seller
	]);
});
router.get('/getsellercategorytree/:id', (req, res) => {
	res.handle(getSelectedCategories, [req.getUser()]);
});

router.post('/addcategory', (req, res) => {
	res.handle(updateSellerCategories, [req.body.seller, req.body]);
});
router.post('/updatecategoryname', (req, res) => {
	res.handle(updateCategoryName, [req.body]);
});
router.post('/deletesellercategory', (req, res) => {
	res.handle(deleteSellerCategory, [req.getUser(), req.body]);
});

router.get('/get-parent-category', (req, res) => {
	res.handle(getParentCategory, req.getUser());
});

router.get('/get-category/levels/:level/parentId/:parentId', (req, res) => {
	res.handle(getSubcategory, [req.params.level, req.params.parentId, req.getUser()]);
});

router.get('/all-categories', (req, res) => {
	res.handle(getAllCategories, [req.getUser()]);
});

router.post('/levelOfCategoriesSuggestion', (req, res) => {
	res.handle(getCategoryForSuggestions, [req.body]);
});

router.post('/all-specifications', (req, res) => {
	res.handle(getAllSpecifications, [req.body, req.getUser()]);
});
// router.post('/seller-settlements', (req, res) => {
// 	res.handle(sellerSettlements, [req.body]);
// });
router.get('/product/inactive', (req, res) => {
	res.handle(getDisabledProducts, [req.query, req.getUser()], 'list');
});

router.get('/product/out-of-stock', (req, res) => {
	res.handle(getOutOfStockProducts, [req.query, req.getUser()], 'list');
});

//seller excel product download..
router.get('/excel/seller-products/:id', async (req, res) => {
	try {
		const filename = `${req.params.id}_Products.xlsx`;
		const wbOpts = { bookType: 'xlsx', type: 'buffer' } as const;
		const result = await sellerProductExcel(req.params.id);
		XLSX.writeFile(result, filename, wbOpts);

		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.setHeader('Content-Type', 'application/octet-stream');

		const stream = fs.createReadStream(filename);
		stream.pipe(res);

		res.on('finish', () => {
			fs.unlink(filename, (err) => {
				if (err) {
					console.error(err);
				} else {
				}
			});
		});
	} catch (err) {}
});

router.get('/product/:id', (req, res) => {
	res.handle(getProductById, [req.params.id, req.getUser()]);
});

router.get('/product/category/:level/:id', (req, res) => {
	res.handle(getProductByCategoryAndLevel, [
		req.params.level,
		req.params.id,
		req.getUser(),
		req.query
	]);
});

// disable products

// router.get('/product/subCategory/:level/:id', (req, res) => {
// 	res.handle(getProductBySubCategoryAndLevel, [
// 		req.params.level,
// 		req.params.id,
// 		req.getUser(),

// 	]);
// });

router.post('/add-product', multerValidation(validateProduct), (req, res) => {
	res.handle(addProduct, [req.body, req.files, req.getUser()]);
});

router.put('/add-product/:id', multerValidation(validateProduct), (req, res) => {
	res.handle(updateProduct, [req.params.id, req.body, req.files, req.getUser()]);
});

router.put('/update-price/:id', (req, res) => {
	res.handle(updatePrice, [req.params.id, req.body, req.getUser()]);
});

router.put('/product/:id/status/:status', (req, res) => {
	res.handle(changeProductStatus, [req.params.id, req.params.status, req.body, req.getUser()]);
});

// subscategory disable product
// router.put('/product/subCategory/:level/:id/status/:status', (req, res) => {
// 	res.handle(changeSubProductStatus, [req.params.id, req.params.level,req.params.status, req.body, req.getUser()]);
// });

// router.get("/calling",(req,res)=>{
//      res.handle(newFormathelper)
// });

// start schedule and timings related routes
router.post('/timings/setimings', (req, res) => {
	//timing
	res.handle(storeTimings, [req.body]);
});

router.post('/timings/manualschedule', (req, res) => {
	//force disable
	res.handle(forceDisable, [req.body, req.getUser()]);
});

router.post('/rejected/products/manualschedule', (req, res) => {
	//disable till tomorrow
	res.handle(disableOrderRejectedProducts, [req.body, req.getUser()]);
});

router.post('/timings/removeschedule', (req, res) => {
	res.handle(removeDailyAndWeeklySchedule, [req.body, req.getUser()]);
});
router.post('/timings/gettimingsofcategory', (req, res) => {
	res.handle(getScheduleOfCategories, [req.body]);
});
router.post('/timings/gettimingsofproduct', (req, res) => {
	res.handle(getScheduleOfProducts, [req.body]);
});
router.post('/timings/removemanualschedule', (req, res) => {
	res.handle(removeManuallySchedule, [req.body, req.getUser()]);
});

// end of timings and schedule related routes

router.delete('/product/:id', (req, res) => {
	res.handle(deleteProduct, [req.params.id, req.getUser()]);
});

router.get('/search-product-catalog', (req, res) => {
	res.handle(getAllProducts, [req.query, req.getUser()]);
});

router.get('/search/product', (req, res) => {
	res.handle(searchProducts, [req.query, req.getUser()]);
});

router.put('/shop/:status', (req, res) => {
	res.handle(updateShopStatus, [req.params.status, req.getUser(), req.body]);
});

router.delete('/', (req, res) => {
	res.handle(deleteAccount, [req.getUser()]);
});

router.post('/contacts', (req, res) => {
	res.handle(uploadContacts, [req.body, req.getUser()]);
});

router.put('/confirm-rider', (req, res) => {
	res.handle(confirmRider, [req.body, req.getUser()]);
});

router.get('/get-rider', (req, res) => {
	res.handle(getRider, [req.query, req.getUser()]);
});

router.put('/disable/:id/:date/:time', (req, res) => {
	res.handle(updateDisableStatus, [
		req.params.id,
		req.params.date,

		req.params.time,
		req.getUser()
	]);
});

router.post('/upload', multerExcelValidation.single('file'), (req, res) => {
	res.handle(bulkUpload, [req]);
});

// seller admin pannel order status
router.post('/getstats', (req, res) => {
	res.handle(getSellerStats, [req.query, req.body]);
});
router.post('/chart', (req, res) => {
	res.handle(getChartData, [req.query, req.body]);
});

router.post('/upload', multerExcelValidation.single('file'), (req, res) => {
	res.handle(bulkUpload, [req]);
});

export default router;
