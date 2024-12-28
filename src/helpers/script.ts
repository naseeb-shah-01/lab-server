// import { Types, model } from 'mongoose';
// import CustomerModel, { ICustomer } from '../models/customer/customer';

// import { IWishlist } from '../models/customer/wishlist';
// import OrderModel, { IOrder } from '../models/order/order';

// import { ISeller } from '../models/customer/seller';
// import newProductModel from '../models/seller/product';
// import PriceModel from '../models/seller/price';
// import CategoryModel, { ICategory } from '../models/category/category';
// import { defineLocale } from 'moment';
// import RiderModel from '../models/rider/rider';
// import { IProduct } from '../models/seller/product';
// const NewProduct = model<IProduct>('NewProduct');

// import CouponModel from '../models/customer/coupons';
// import { logging_v2 } from 'googleapis';

// import { ISellerCategory } from '../models/seller/seller-category';
// import { getAllCategories } from '../controllers/customers/admin-customer';
// import { selectCategoryByCustomer } from '../controllers/categories/customer-categories';
// const Customer = model<ICustomer>('Customer');
// const Wishlist = model<IWishlist>('Wishlist');
// const Seller = model<ISeller>('NewCustomer');
// const Order = model<IOrder>('Order');
// const SellerCategory = model<ISellerCategory>('SellerCategory');
// const Category = model<ICategory>('Category');

// export const migrationScript = async () => {
// 	try {
// 		let response = [];
// 		let allproducts: any = {};
// 		let allSellers = await Customer.find({
// 			seller: true,
// 			_id: '60e7f1139dc49c13d80d50f8'
// 		}).lean();

// 		for (let seller of allSellers) {
// 			let level1 = await Category.find({ level: 1 }).lean();

// 			let level2 = await Category.find({ level: 2 }).lean();
// 			let level3 = await Category.find({ level: 3 }).lean();
// 			let level4 = await Category.find({ level: 4 }).lean();
// 			let recentlyCreated = [];
// 			for (let l1 of level1) {
// 				let globalCatID = l1._id;
// 				delete l1._id;
// 				delete l1.createdBy;
// 				delete l1.createdAt;
// 				delete l1.updatedAt;
// 				delete l1.updatedBy;
// 				delete l1.returnPeriod;
// 				delete l1.insurance;
// 				let createNewL1IntoSellerCategory = new SellerCategory({
// 					...l1,
// 					seller: seller._id,
// 					globalCatID
// 				});
// 				if (!createNewL1IntoSellerCategory.globalCatID) {
// 					return;
// 				}
// 				recentlyCreated.push(createNewL1IntoSellerCategory);
// 			}
// 			for (let l2 of level2) {
// 				let level1 = recentlyCreated.find(
// 					(c, index) => c?.globalCatID?.toString() == l2?.level1.toString()
// 				)?._id;
// 				if (!level1) {
// 					 => !c.globalCatID)[0]);

// 					;
// 					return;
// 				}
// 				let globalCatID = l2._id;
// 				delete l2._id;
// 				delete l2.createdBy;
// 				delete l2.createdAt;
// 				delete l2.updatedAt;
// 				delete l2.updatedBy;
// 				delete l2.returnPeriod;
// 				delete l2.insurance;
// 				let createNewL1IntoSellerCategory = new SellerCategory({
// 					...l2,
// 					level1,
// 					seller: seller._id,
// 					globalCatID
// 				});
// 				recentlyCreated.push(createNewL1IntoSellerCategory);
// 			}
// 			for (let l3 of level3) {
// 				let level1 = recentlyCreated.find(
// 					(c) => c.globalCatID.toString() == l3.level1.toString()
// 				)._id;

// 				let level2 = recentlyCreated.find(
// 					(c) => c.globalCatID.toString() == l3.level2.toString()
// 				)._id;
// 				let globalCatID = l3._id;
// 				delete l3._id;
// 				delete l3.createdBy;
// 				delete l3.createdAt;
// 				delete l3.updatedAt;
// 				delete l3.updatedBy;
// 				delete l3.returnPeriod;
// 				delete l3.insurance;
// 				let createNewL1IntoSellerCategory = new SellerCategory({
// 					...l3,
// 					level1,
// 					level2,
// 					seller: seller._id,
// 					globalCatID
// 				});
// 				recentlyCreated.push(createNewL1IntoSellerCategory);
// 			}
// 			for (let l4 of level4) {
// 				let level1 = recentlyCreated.find(
// 					(c) => c.globalCatID.toString() == l4.level1.toString()
// 				)._id;

// 				let level2 = recentlyCreated.find(
// 					(c) => c.globalCatID.toString() == l4.level2.toString()
// 				)._id;
// 				let level3 = recentlyCreated.find(
// 					(c) => c.globalCatID.toString() == l4.level3.toString()
// 				)._id;
// 				let globalCatID = l4._id;
// 				delete l4._id;
// 				delete l4.createdBy;
// 				delete l4.createdAt;
// 				delete l4.updatedAt;
// 				delete l4.updatedBy;
// 				delete l4.returnPeriod;
// 				delete l4.insurance;
// 				let createNewL1IntoSellerCategory = new SellerCategory({
// 					...l4,
// 					level1,
// 					level2,
// 					level3,
// 					seller: seller._id,
// 					globalCatID
// 				});
// 				recentlyCreated.push(createNewL1IntoSellerCategory);
// 			}
// 			;
// 			await SellerCategory.insertMany(recentlyCreated);
// 			let res = await createProduct(seller._id);
// 			response.push(res);
// 		}
// 		await setProductCountLevel4();
// 		return response;
// 	} catch (error) {
// 		console.error(error);
// 	}
// };

// export const createProduct = async (sellerId) => {
// 	let productCount = 0;
// 	let allProductsArray = [];
// 	let unCreateProduct = [];
// 	let sellerNewCate = await SellerCategory.find({ seller: sellerId })
// 		.select('globalCatID seller')
// 		.lean();

// 	let sellerProducts = await PriceModel.find({ seller: sellerId }).populate('product');
// 	for (let price of sellerProducts) {
// 		let product: any = price.product;
// 		let level1 = sellerNewCate.find(
// 			(c) =>
// 				c.globalCatID.toString() === product.level1.toString() &&
// 				c.seller.toString() == sellerId.toString()
// 		)._id;
// 		if (!product.level2) {
// 			;
// 		}
// 		let level2 = sellerNewCate.find(
// 			(c) =>
// 				c.globalCatID.toString() === product.level2.toString() &&
// 				c.seller.toString() == sellerId.toString()
// 		)?._id;
// 		if (!level2) {
// 			;
// 		}
// 		let level3;
// 		if (product.level3) {
// 			level3 = sellerNewCate.find(
// 				(c) =>
// 					c.globalCatID.toString() === product.level3.toString() &&
// 					c.seller.toString() == sellerId.toString()
// 			)._id;
// 		}
// 		if (!level3) {
// 			;
// 		}
// 		let level4;
// 		if (product.level4) {
// 			level4 = sellerNewCate.find(
// 				(c) =>
// 					c.globalCatID.toString() === product.level4.toString() &&
// 					c.seller.toString() == sellerId.toString()
// 			)._id;
// 		}
// 		if (!level4) {
// 			;
// 		}

// 		if (level1 && level2) {
// 			let newProduct = {
// 				name: product.name,
// 				seller: sellerId,
// 				level1,
// 				level2,
// 				...(level3 ? { level3 } : {}),
// 				...(level4 ? { level4 } : {}),
// 				type: product.type,
// 				specifications: product.specifications,
// 				description: product.description,
// 				thumbImages: product.thumbImages,
// 				minPrice: {
// 					price: price.price,
// 					sellingPrice: price.sellingPrice,
// 					mainPrice: price.mainPrice,
// 					gstType: price.gstType,
// 					gstValue: price.gstValue,
// 					gst: price.gst
// 				}
// 			};
// 			allProductsArray.push(newProduct);
// 			productCount++;
// 		}
// 	}
// 	let insertedProduct = await NewProduct.insertMany(allProductsArray);
// 	let newCreateSeller = await createSeller(sellerId);
// 	return {
// 		productCreated: productCount,
// 		insertedProduct: insertedProduct?.length || 0,
// 		sellerId: sellerId,
// 		newCreateSeller
// 	};
// };

// export const createSeller = async (customerId) => {
// 	;
// 	try {
// 		let seller = await Customer.findOne({ _id: customerId }).lean();
// 		let parentCategory = seller.categories.map((c) => c.l1);
// 		delete seller.seller;
// 		delete seller.buyer;
// 		delete seller.level4;
// 		let sellerCreate = new Seller({
// 			...seller,
// 			approved: false,
// 			parentCategory
// 		});
// 		let res = await sellerCreate.save();

// 		return res;
// 	} catch (err) {
// 		;
// 	}
// };
// // level4
// export const setProductCountLevel4 = async () => {
// 	let categoryObj: any = {};
// 	let filterOut = await NewProduct.find({}).select('level1 level2 level3 level4');
// 	filterOut.forEach((item: any) => {
// 		if (!categoryObj[item.level1]) {
// 			categoryObj[item.level1] = 1;
// 		} else {
// 			categoryObj[item.level1] += 1;
// 		}
// 		if (item.level2) {
// 			if (!categoryObj[item.level2]) {
// 				categoryObj[item.level2] = 1;
// 			} else {
// 				categoryObj[item.level2] += 1;
// 			}
// 		}
// 		if (item.level3) {
// 			if (!categoryObj[item.level3]) {
// 				categoryObj[item.level3] = 1;
// 			} else {
// 				categoryObj[item.level3] += 1;
// 			}
// 		}
// 		if (item.level4) {
// 			if (!categoryObj[item.leve4]) {
// 				categoryObj[item.level4] = 1;
// 			} else {
// 				categoryObj[item.level4] += 1;
// 			}
// 		}
// 	});
// 	;
// 	let promiseArray = [];
// 	for (let key in categoryObj) {
// 		let pre = SellerCategory.updateOne(
// 			{
// 				_id: key
// 			},
// 			{
// 				$set: {
// 					productCount: categoryObj[key]
// 				}
// 			}
// 		);
// 		promiseArray.push(pre);
// 	}
// 	await Promise.all(promiseArray)
// 		.then((res) => {
// 			;
// 		})
// 		.catch((err) => {
// 			;
// 		});

// 	// let categoryWithCount = await NewProduct.aggregate([
// 	// 	{
// 	// 		$group: {
// 	// 			_id: '$level4',
// 	// 			count: { $sum: 1 }
// 	// 		}
// 	// 	}
// 	// ]);
// 	// // category haing products
// 	// let allCategories = categoryWithCount.map((c) => c._id);
// 	// // update productCount
// 	// ;
// 	// for (let cat of categoryWithCount) {
// 	// 	try {
// 	// 		await SellerCategory.updateOne(
// 	// 			{ _id: cat._id },
// 	// 			{
// 	// 				$set: {
// 	// 					productCount: cat.count
// 	// 				}
// 	// 			}
// 	// 		);
// 	// 	} catch (err) {
// 	// 		;
// 	// 	}
// 	// }
// 	// // level 3
// 	// categoryWithCount = await NewProduct.aggregate([
// 	// 	{
// 	// 		$match: {
// 	// 			level4: {
// 	// 				$exists: false
// 	// 			}
// 	// 		}
// 	// 	},
// 	// 	{
// 	// 		$group: {
// 	// 			_id: '$level3',
// 	// 			count: { $sum: 1 }
// 	// 		}
// 	// 	}
// 	// ]);
// 	// // category haing products
// 	// allCategories = categoryWithCount.map((c) => c._id);
// 	// ;
// 	// // update productCount
// 	// for (let cat of categoryWithCount) {
// 	// 	try {
// 	// 		await SellerCategory.updateOne(
// 	// 			{ _id: cat._id },
// 	// 			{
// 	// 				$set: {
// 	// 					productCount: cat.count
// 	// 				}
// 	// 			}
// 	// 		);
// 	// 	} catch (err) {
// 	// 		;
// 	// 	}
// 	// }

// 	// categoryWithCount = await NewProduct.aggregate([
// 	// 	{
// 	// 		$match: {
// 	// 			level4: {
// 	// 				$exists: false
// 	// 			},
// 	// 			level3: {
// 	// 				$exists: false
// 	// 			}
// 	// 		}
// 	// 	},
// 	// 	{
// 	// 		$group: {
// 	// 			_id: '$level2',
// 	// 			count: { $sum: 1 }
// 	// 		}
// 	// 	}
// 	// ]);
// 	// // category haing products
// 	// allCategories = categoryWithCount.map((c) => c._id);
// 	// // update productCount
// 	// ;
// 	// for (let cat of categoryWithCount) {
// 	// 	try {
// 	// 		await SellerCategory.updateOne(
// 	// 			{ _id: cat._id },
// 	// 			{
// 	// 				$set: {
// 	// 					productCount: cat.count
// 	// 				}
// 	// 			}
// 	// 		);
// 	// 	} catch (err) {
// 	// 		;
// 	// 	}
// 	// }

// 	//     remove categories which has no products at level4
// 	await deleteUnwantedCategory();
// };

// export const deleteUnwantedCategory = async () => {
// 	//  where productCount is zero
// 	// let removeLevel4 = await SellerCategory.deleteMany({ level: 4, productCount: { $eq: 0 } });
// 	// //     find  l3  category  which has   subCategories
// 	// let l3 = await SellerCategory.find({ level: 4 }).select('level3');
// 	// let l3CatIds = l3.map((cat) => cat.level3);
// 	// let deleteCat3 = await SellerCategory.deleteMany({
// 	// 	level: 3,
// 	// 	_id: { $nin: l3CatIds },
// 	// 	productCount: { $eq: 0 }
// 	// });

// 	// let l2 = await SellerCategory.find({ level: 3 }).select('level2');
// 	// let l2CatIds = l2.map((cat) => cat.level3);
// 	let deleteCat2 = await SellerCategory.deleteMany({
// 		productCount: { $eq: 0 }
// 	});
// 	;

// 	// update restaurant flag
// 	await SellerCategory.updateMany(
// 		{
// 			name: 'Food & Beverages'
// 		},
// 		{
// 			$set: {
// 				isRestaurantService: true
// 			}
// 		}
// 	);

// 	return;
// };
