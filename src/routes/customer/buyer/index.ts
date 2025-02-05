import { Router } from 'express';
import {
	checkProductStatus,
	getBasicCart,
	getCart,
	removeProductFromCart,
	resetAndUpdateCart,
	updateItemsInCart
} from '../../../controllers/customers/cart';
import {
	availableDeliveryOptions,
	cancelOrderPlacement,
	checkRecentOrders,
	createOrder,
	gstAndTaxCalculationAfterCouponApply,
	placeOrder
} from '../../../controllers/customers/order';
import { failWalletTopUp, topUpWallet } from '../../../controllers/customers/wallet';
import {
	addWishlistItem,
	getWishlist,
	removeWishlistItem
} from '../../../controllers/customers/wishlist';
import profile from './profile';
import category from './category';
import sellers from './sellers';
import {
	applyWalletAndReward,
	deleteAccount,
	filterNonRunning,
	filterRunning,
	filterSeller,
	getAppMetadata,
	getLocations,
	getWalletBalance,
	removeWalletAndReward,
	saveBuyerOnBoardingData,
	search,
	searchProducts,
	searchProductsBySeller,
	searchRunningOrders,
	sellerByOneSelection,
	sendHomePageData
} from '../../../controllers/buyer/buyer';
import {
	getAvailableCategory,
	getProductById,
	getProductsByCategoryAndLevel,
	getRecommendedProducts
} from '../../../controllers/buyer/product';
import {
	clearBuyerNotifications,
	getAllNotifications
} from '../../../controllers/buyer/notifications';
import {
	cancelOrder,
	createReturnRequest,
	getBuyerOrders,
	getBuyerRunningOrders,
	getBuyerTopUpOrders,
	getOrderById,
	orderRating,
	ratingReasons
} from '../../../controllers/buyer/orders';
import { getInvoices } from '../../../controllers/buyer/invoices';

import {
	addSelectedSeller,
	addWalletStatus,
	checkValidCoupon,
	getCoupons,
	getCouponsMultipleSellers,
	getCustomerCoupon,
	removeCoupon
} from '../../../controllers/customers/coupons';
import { getTotalOrders } from '../../../controllers/rider/orders';
import { sendBuyerNotification } from '../../../helpers/notifications/notification';
import { createBuyerNotification } from '../../../helpers/notifications/buyer';

const router = Router();

router.use('/profile', profile);
router.use('/categories', category);
router.use('/sellers', sellers);

//  send home Page all data
router.post('/buyerhome', (req, res) => {
	res.handle(sendHomePageData, [req.body, req.getUser()]);
});
router.get('/wishlist', (req, res) => {
	res.handle(getWishlist, req.getUser());
});
router.post('/selected-seller', (req, res) => {
	res.handle(sellerByOneSelection, [req.body]);
});

router.post('/wishlist', (req, res) => {
	res.handle(addWishlistItem, [req.body, req.getUser()]);
});

router.delete('/wishlist/:id', (req, res) => {
	res.handle(removeWishlistItem, [req.params.id]);
});

router.get('/coupons', (req, res) => {
	res.handle(getCoupons, [req.getUser(), req.query]);
});
router.post('/coupons/sellers', (req, res) => {
	res.handle(getCouponsMultipleSellers, [req.getUser(), req.body]);
});


router.get('/appliedcoupon', (req, res) => {
	res.handle(getCustomerCoupon, [req.getUser()]);
});

router.get('/coupons/:id', (req, res) => {
	res.handle(checkValidCoupon, [req.params.id, req.getUser(), req.query]);
});

router.get('/selectedseller/:id', (req, res) => {
	res.handle(addSelectedSeller, [req.params.id, req.getUser()]);
});

router.get('/walletstatus/:status', (req, res) => {
	res.handle(addWalletStatus, [req.params.status, req.getUser()]);
});

router.post('/cart', (req, res) => {
	res.handle(getCart, [req.body, req.getUser()]);
});

router.get('/cart/basic', (req, res) => {
	res.handle(getBasicCart, [req.getUser()]);
});

router.put('/cart', (req, res) => {
	res.handle(updateItemsInCart, [req.body, req.getUser()]);
});

router.delete('/cart/product/:id', (req, res) => {
	res.handle(removeProductFromCart, [req.params.id, req.getUser()]);
});
//  place order  remove  req.getUser() for testing purpose

router.post('/order', (req, res) => {
	res.handle(createOrder, [req.body, req.getUser()]);
});
router.post('/order-recalculation', (req, res) => {
	res.handle(gstAndTaxCalculationAfterCouponApply, [req.body, req.getUser()]);
});

router.get('/activereorder/:id', (req, res) => {
	res.handle(checkProductStatus, [req.params.id, req.getUser()]);
});

router.post('/reorder', (req, res) => {
	res.handle(resetAndUpdateCart, [req.body.id, req.getUser()]);
});

router.post('/order/place', (req, res) => {
	res.handle(placeOrder, [req.body, req.getUser()]);
});

router.post('/wallet/top-up', (req, res) => {
	res.handle(topUpWallet, [req.body, req.getUser()]);
});

router.post('/wallet/top-up/failed/:id', (req, res) => {
	res.handle(failWalletTopUp, [req.params.id, req.getUser()]);
});

router.get('/order/recent', (req, res) => {
	res.handle(checkRecentOrders, [req.getUser()]);
});
router.get('/referral/:id', (req, res) => {
	res.handle(cancelOrder, [req.params.id, req.getUser()]);
});
router.post('/order/failed/:id', (req, res) => {
	res.handle(cancelOrderPlacement, [req.params.id, req.getUser()]);
});

router.get('/orders', (req, res) => {
	res.handle(getBuyerOrders, [req.query, req.getUser()], 'list');
});
router.post('/order-rating', (req, res) => {
	res.handle(orderRating, [req?.body]);
});

router.get('/running-orders', (req, res) => {
	res.handle(getBuyerRunningOrders, [req.getUser()]);
});

router.get('/topup-orders', (req, res) => {
	res.handle(getBuyerTopUpOrders, [req.query, req.getUser()], 'list');
});

router.post('/onboarding', (req, res) => {
	res.handle(saveBuyerOnBoardingData, [req.body, req.getUser()]);
});

router.get('/orders/:id', (req, res) => {
	res.handle(getOrderById, [req.params.id, req.getUser()]);
});

router.get('/wallet', (req, res) => {
	res.handle(getWalletBalance, [req.getUser(), req.query]);
});
router.post('/wallet', (req, res) => {});

router.post('/orders/:id/return', (req, res) => {
	res.handle(createReturnRequest, [req.params.id, req.body, req.getUser()]);
});

router.post('/orders/:id/cancel', (req, res) => {
	res.handle(cancelOrder, [req.params.id, req.body, req.getUser()]);
});

router.get('/counts', (req, res) => {
	res.handle(getTotalOrders, [req.getUser()]);
});

router.get('/removecoupon', (req, res) => {
	res.handle(removeCoupon, [req.getUser()]);
});

router.post('/search', (req, res) => {
	res.handle(search, [req.query, req.body, req.getUser()]);
});

router.post('/search/non-running', (req, res) => {
	res.handle(searchProducts, [req.query, req.body, req.getUser()]);
});
router.post('/searchbyseller', (req, res) => {
	res.handle(searchProductsBySeller, [req.query, req.body, req.getUser()]);
});

router.post('/search/running', (req, res) => {
	res.handle(searchRunningOrders, [req.query, req.body, req.getUser()], 'list');
});

router.post('/filter/running', (req, res) => {
	res.handle(filterRunning, [req.query, req.body, req.getUser()], 'list');
});

router.post('/filter/non-running', (req, res) => {
	res.handle(filterNonRunning, [req.query, req.body, req.getUser()], 'list');
});

router.post('/filter/seller', (req, res) => {
	res.handle(filterSeller, [req.query, req.body, req.getUser()], 'list');
});

router.post('/product/:id', (req, res) => {
	res.handle(getProductById, [req.params.id, req.body, req.getUser()]);
});

router.get('/notifications', (req, res) => {
	res.handle(getAllNotifications, [req.query, req.getUser()], 'list');
});

router.post('/notifications/clear', (req, res) => {
	res.handle(clearBuyerNotifications, [req.getUser()]);
});

router.get('/invoices', (req, res) => {
	res.handle(getInvoices, [req.query, req.getUser()], 'list');
});

router.post('/recommendedProducts', (req, res) => {
	res.handle(getRecommendedProducts, [req.body, req.query], 'list');
});

router.post('/products/category/:level/:category', (req, res) => {
	res.handle(
		getProductsByCategoryAndLevel,
		[req.params.level, req.params.category, req.body, req.query],
		'list'
	);
});

router.get('/locations', (req, res) => {
	res.handle(getLocations, [req.getUser()]);
});

router.delete('/', (req, res) => {
	res.handle(deleteAccount, [req.getUser()]);
});

router.get('/metadata/:appName/:versionName', (req, res) => {
	res.handle(getAppMetadata, [req.params.appName, req.params.versionName]);
});
// this route is used to  send rating  reasons to user
router.get('/rating-reasons', (req, res) => {
	res.handle(ratingReasons);
});
//  self delivery is available or not a delivery location
router.post('/available-delivery', (req, res) => {
    
	res.handle(availableDeliveryOptions, [req.body]);
});

router.post('/apply-reward-wallet', (req, res) => {
	res.handle(applyWalletAndReward, [req.body, req.getUser()]);
});
router.post('/remove-reward-wallet', (req, res) => {
	res.handle(removeWalletAndReward, [req.body, req.getUser()]);
});

//  this route is only testing purpose

export default router;
