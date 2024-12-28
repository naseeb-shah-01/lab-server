import { model } from 'mongoose';
// import { deletePrivateProps } from '../../helpers/query';
// import { throwError } from '../../helpers/throw-errors';
import CustomerModel, { ICustomer } from '../../models/customer/customer';

import { IWishlist } from '../../models/customer/wishlist';
import { IOrder } from '../../models/order/order';

import { setCustomerType } from './customer';
import { ISeller } from '../../models/customer/seller';
import newProductModel from '../../models/seller/product';
import PriceModel from '../../models/seller/price';
import CategoryModel from '../../models/category/category';
import { defineLocale } from 'moment';
import RiderModel from '../../models/rider/rider';
import { IProduct } from '../../models/seller/product';
const NewProduct = model<IProduct>('NewProduct');

import CouponModel from '../../models/customer/coupons';
const Customer = model<ICustomer>('Customer');
const Wishlist = model<IWishlist>('Wishlist');
const Seller = model<ISeller>('NewCustomer');

export const addHasProductFlagInCategory = async () => {
	let allSellers = await Seller.find({}, { _id: 1 });

	// for (let seller of allSellers) {
	// 	let currentSeller = await Seller.findOne({ _id: seller._id });
	// 	if (currentSeller.productCategory.length > 0) {
	// 		for (let level1 of currentSeller.productCategory) {
	// 			for (let level2 of level1.sub) {
	// 				let hasProduct = await NewProduct.findOne({
	// 					level2: level2._id
	// 				});
	// 				if (hasProduct) {
	// 					level2.hasProduct = true;
	// 				} else {
	// 					level2.hasProduct = false;
	// 				}
	// 				for (let level3 of level2.sub) {
	// 					let hasProduct = await NewProduct.findOne({
	// 						level3: level3._id
	// 					});
	// 					if (hasProduct) {
	// 						level3.hasProduct = true;
	// 					} else {
	// 						level3.hasProduct = false;
	// 					}

	// 					for (let level4 of level3.sub) {
	// 						let hasProduct = await NewProduct.findOne({
	// 							level2: level4._id
	// 						});
	// 						if (hasProduct) {
	// 							level4.hasProduct = true;
	// 						} else {
	// 							level4.hasProduct = false;
	// 						}
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}
	// 	await currentSeller.save();
	// }
	return allSellers;
};
