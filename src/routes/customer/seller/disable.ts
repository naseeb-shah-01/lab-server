import { model, Types } from 'mongoose';

import { CronJob } from 'cron';
import { ITiming } from '../../../models/general/timing';
import { addMinutes } from 'date-fns';
import { ISeller } from '../../../models/customer/seller';
import { IProduct } from '../../../models/seller/product';
import { duration } from 'moment';
import * as DateFns from 'date-fns';
import { isNull } from 'util';
import { throwError } from '../../../helpers/throw-errors';
import { ISellerCategory } from '../../../models/seller/seller-category';

const Seller = model<ISeller>('NewCustomer');
const NewProduct = model<IProduct>('NewProduct');
const Timing = model<ITiming>('Timing');
const ObjectId = Types.ObjectId;
const SellerCategory = model<ISellerCategory>('SellerCategory');
const setStatusActive = async (data) => {
	try {
		let { products, categories, shops } = data;
		products = products?.map((e) => ObjectId(e));
		let updateProductsStatus = await NewProduct.updateMany(
			{ _id: { $in: products }, mannualSchedule: null, scheduleBy: 'product' },
			{ $set: { status: 'active' } }
		);

		if (categories.length) {
			await enableByCategory(categories);
		}
	} catch (err) {
		throw new Error(err);
	}
};
export const storeTimings = async (data) => {
	try {
		let { durationType, products, categories, shops, disable, timings, type } = data;

		if (!products?.length) {
			products = [];
		}
		if (!categories?.length) {
			categories = [];
		}
		if (!shops?.length) {
			shops = [];
		}
		let categoriesForRemoveOld = categories.map((e) => ObjectId(e?.cat_id));

		let removeCategories = await Timing.updateMany(
			{ 'categories.cat_id': { $in: categoriesForRemoveOld } },
			{ $pull: { categories: { cat_id: { $in: categoriesForRemoveOld } } } }
		);

		await Timing.updateMany(
			{ products: { $in: products } },
			{ $pull: { products: { $in: products } } }
		);
		let findQuery: Record<string, any> = {};
		if (products.length > 0) {
			findQuery = {
				_id: { $in: products }
			};
		} else if (categories.length > 0) {
			findQuery = {
				...(categories[0].level == 2
					? { level2: categories[0].cat_id }
					: categories[0].level == 3
					? { level3: categories[0].cat_id }
					: { level4: categories[0].cat_id })
			};
		}
		let updateProducts = await NewProduct.updateMany(findQuery, {
			$set: {
				scheduleBy: products.length ? 'product' : 'category'
			}
		});
		if (categories[0].level == 2 || categories[0].level == 3) {
			if (categories[0].level == 3) {
				let updateCategories = await SellerCategory.updateMany(
					{
						level3: categories[0].cat_id
					},
					{
						$set: {
							scheduleBy: 'level3'
						}
					}
				);
			}
			if (categories[0].level == 2) {
				let updateCategories = await SellerCategory.updateMany(
					{
						level3: categories[0].cat_id
					},
					{
						$set: {
							scheduleBy: 'level2'
						}
					}
				);
			}
		}
		if (durationType == 'week') {
			timings.forEach(async (element) => {
				let day = getDayIndex(element.day);
				element?.slots.forEach(async (slot) => {
					let start = convertTo24Hour(slot.startTime);
					let end = convertTo24Hour(slot.endTime);
					let previousTimings = await Timing.findOne({
						durationType: 'week',
						startTime: start,
						endTime: end,
						fullyEnableDays: day,
						disable: disable
					});
					if (previousTimings) {
						if (!previousTimings.products) {
							previousTimings.products = [];
						}
						if (!previousTimings.shops) {
							previousTimings.shops = [];
						}
						if (!previousTimings.categories) {
							previousTimings.categories = [];
						}

						previousTimings.products = [...previousTimings.products, ...products];
						previousTimings.shops = [...previousTimings.shops, ...shops];
						previousTimings.categories = [...previousTimings.categories, ...categories];

						await previousTimings.save();
					} else {
						let newTimings = await new Timing({
							disable: disable,
							startTime: start,
							endTime: end,

							products: products,

							shops: shops,

							categories: categories,
							fullyEnableDays: [day],

							durationType: durationType,
							type: type
						});
						newTimings.save();
					}
				});
			});
		} else if (durationType === 'daily') {
			timings.forEach(async (slot) => {
				let start = slot.start;
				let end = slot.end;
				let previousTimings = await Timing.findOne({
					durationType: 'daily',
					startTime: start,
					endTime: end,

					disable: disable
				});
				if (previousTimings) {
					previousTimings.products = [...previousTimings.products, ...products];
					previousTimings.shops = [...previousTimings.shops, ...shops];
					previousTimings.categories = [...previousTimings.categories, ...categories];
					await previousTimings.save();
				} else {
					let newTimings = await new Timing({
						disable: disable,
						startTime: start,
						endTime: end,

						products: products,

						shops: shops,

						category: categories,

						durationType: durationType,
						type: type
					});

					newTimings.save();
				}
			});
		}
		if (products?.length) {
			await NewProduct.updateMany(
				{
					_id: { $in: products }
				},
				{
					$set: {
						scheduleBy: 'product'
					}
				}
			);
		}
		if (categories?.length) {
			let level2Categories = categories
				.filter((cate) => cate.level == 2)
				.map((e) => e.cat_id);
			let level3Categories = categories
				.filter((cate) => cate.level == 3)
				.map((e) => e.cat_id);
			let level4Categories = categories
				.filter((cate) => cate.level == 4)
				.map((e) => e.cat_id);
			if (level2Categories.length) {
				let updateProductLevel2category = await NewProduct.updateMany(
					{
						$or: [{ level2: { $in: level2Categories } }]
					},
					{
						$set: {
							scheduleBy: 'category'
						}
					}
				);
			}
			if (level3Categories.length) {
				let updateProductLevel3category = await NewProduct.updateMany(
					{
						$or: [{ level3: { $in: level3Categories } }]
					},
					{
						$set: {
							scheduleBy: 'category'
						}
					}
				);
			}
			if (level4Categories.length) {
				let updateProductLevel4category = await NewProduct.updateMany(
					{
						$or: [{ level4: { $in: level4Categories } }]
					},
					{
						$set: {
							scheduleBy: 'category'
						}
					}
				);
			}
		}

		return data;
	} catch (e) {
		throw e;
	}
};
// this cronjob for updated every 30 mint
new CronJob(
	'* * * * *',
	function () {
		let currentTime = new Date();

		let date = currentTime.getDate();
		let month = currentTime.getMonth();
		let hour = currentTime.getHours();
		let min = currentTime.getMinutes();
		let year = currentTime.getFullYear();
		let day = currentTime.getDay();

		// checkForUpdatesAtCurrentTime(date, month, year, day, hour, min);
		// removeManualScheduler();
	},
	null,
	true
);
new CronJob(
	'* 59 * * * *',
	function () {
		let currentTime = new Date();

		let date = currentTime.getDate();
		let month = currentTime.getMonth();
		let hour = currentTime.getHours();
		let min = currentTime.getMinutes();
		let year = currentTime.getFullYear();
		let day = currentTime.getDay();

		// checkForUpdatesAtCurrentTime(date, month, year, day, hour, min);
		// removeManualScheduler();
	},
	null,
	true
);
const checkForUpdatesAtCurrentTime = async (date, month, year, day, hour, min) => {
	try {
		if (hour < 10) {
			hour = '0' + hour;
		} else {
			hour = hour.toString();
		}
		if (min < 10) {
			min = '0' + min;
		} else {
			min = min.toString();
		}
		if (month < 10) {
			month = '0' + month;
		}
		if (date < 10) {
			date = '0' + date;
		}
		// current time format in number for faster query in database

		let stringOftime = hour + ':' + min;
		let stringOfDate = date + '/' + month + '/' + year;

		let arrayOfTimingsForActivate = await Timing.find({ startTime: stringOftime });

		if (arrayOfTimingsForActivate?.length) {
			for (let slot of arrayOfTimingsForActivate) {
				if (slot.durationType == 'daily' && !slot.disable) {
					setStatusActive(slot);
				} else if (
					slot.durationType == 'week' &&
					!slot.disable &&
					slot.fullyEnableDays.includes(day)
				) {
					setStatusActive(slot);
				}
			}
		}
		let arrayOfTimingsForInacivate = await Timing.find({ endTime: stringOftime });

		if (arrayOfTimingsForInacivate?.length) {
			for (let slot of arrayOfTimingsForInacivate) {
				if (slot.durationType == 'daily' && !slot.disable) {
					setStatusInactive(slot);
				} else if (
					slot.durationType == 'week' &&
					!slot.disable &&
					slot.fullyEnableDays.includes(day)
				) {
					setStatusInactive(slot);
				}
			}
		}
	} catch (err) {
		throw new Error(err);
	}
};

const setStatusInactive = async (data) => {
	try {
		let { products, categories, shops } = data;
		products = products?.map((e) => ObjectId(e));

		let product = await NewProduct.updateMany(
			{ _id: { $in: products }, mannualSchedule: null, scheduleBy: 'product' },

			{ $set: { status: 'inactive' } }
		);

		if (categories) await disableByCategory(categories);

		let changeShopStatus = await Seller.updateMany(
			{ _id: { $in: shops } },
			{ $set: { status: 'inactive' } }
		);
	} catch (err) {
		throw new Error(err);
	}
};
const disableByCategory = async (categories) => {
	try {
		let allLevel1Categories = categories
			.filter((category) => category.level == 1)
			.map((e) => e.cat_id);
		let level2Categories = categories
			.filter((category) => category.level == 2)
			.map((e) => e.cat_id);
		let level3Categories = categories
			.filter((category) => category.level == 3)
			.map((e) => e.cat_id);
		let level4Categories = categories
			.filter((category) => category.level == 4)
			.map((e) => e.cat_id);

		if (allLevel1Categories.length > 0) {
			for (let index = 0; index < allLevel1Categories.length; index++) {
				let categoryId = allLevel1Categories[index];

				//  set all sub categories    isActive false and  productCount is zero

				let updateSub = await SellerCategory.updateMany(
					{ level1: categoryId },
					{
						$set: {
							status: 'inactive',
							productCount: 0
						}
					}
				);

				// update set ProductStatus  inactive
				let productUpdate = await NewProduct.updateMany(
					{
						level1: categoryId
					},
					{
						$set: {
							status: 'inactive'
						}
					}
				);
			}
		}

		// update level2Categories
		if (level2Categories.length > 0) {
			for (let index = 0; index < level2Categories.length; index++) {
				let cat_id = level2Categories[index];

				//   set productCount  zero of subCategory
				let updateSub = await SellerCategory.updateMany(
					{ level2: cat_id },
					{
						$set: {
							status: 'inactive',
							productCount: 0
						}
					}
				);

				let updateProductsInfo = await NewProduct.updateMany(
					{
						level2: cat_id,
						level3: { $exists: false },
						level4: { $exists: false },
						scheduleBy: { $ne: 'product' },
						mannualSchedule: null
					},
					{
						$set: {
							status: 'inactive'
						}
					}
				);

				let updatedProductsCount = updateProductsInfo.nModified || 0;
				if (updatedProductsCount > 0) {
					let levelUpdate = await SellerCategory.updateMany(
						{ _id: ObjectId(cat_id) },
						{ $inc: { productCount: -updatedProductsCount } }
					);
				}
				let upProducts = await NewProduct.updateMany(
					{
						level2: cat_id,

						scheduleBy: { $ne: 'product' },
						mannualSchedule: null
					},
					{
						$set: {
							status: 'inactive'
						}
					}
				);
			}
		}

		// update level3Categories
		if (level3Categories.length > 0) {
			for (let index = 0; index < level3Categories.length; index++) {
				let cat_id = level3Categories[index];
				let updateSubCat = await SellerCategory.updateMany(
					{
						level3: cat_id
					},
					{
						$set: {
							productCount: 0,
							status: 'inactive'
						}
					}
				);

				let updatedProductsInfo = await NewProduct.updateMany(
					{
						level3: cat_id,
						level4: { $exists: false },

						mannualSchedule: null,
						scheduleBy: { $ne: 'product' }
					},
					{
						$set: {
							status: 'inactive'
						}
					}
				);

				let updatedProductsCount = updatedProductsInfo.nModified || 0;
				if (updatedProductsCount > 0) {
					let levelUpdate = await SellerCategory.updateMany(
						{ _id: ObjectId(cat_id) },
						{ $inc: { productCount: -updatedProductsCount } }
					);
				}
				await SellerCategory.updateMany(
					{ _id: cat_id },
					{
						$set: {
							status: 'inactive'
						}
					}
				);

				await NewProduct.updateMany(
					{
						level3: cat_id,

						scheduleBy: { $ne: 'product' },
						mannualSchedule: null
					},
					{
						$set: {
							status: 'inactive'
						}
					}
				);
			}
		}
		// upadate level4categories
		if (level4Categories.length > 0) {
			// update level4categories related Products
			for (let index = 0; index < level4Categories.length; index++) {
				let cat_id = level4Categories[index];
				let updatedProductsCount = await NewProduct.updateMany(
					{
						level4: cat_id,
						mannualSchedule: null,
						scheduleBy: { $ne: 'product' }
					},
					{
						$set: {
							status: 'inactive'
						}
					}
				);
				let productCount = updatedProductsCount?.nModified || 0;
				if (productCount > 0) {
					let levelUpdate = await SellerCategory.updateMany(
						{ _id: ObjectId(cat_id) },
						{ $inc: { productCount: -productCount } }
					);
				}
				await SellerCategory.updateMany(
					{ _id: cat_id },
					{
						$set: {
							status: 'inactive'
						}
					}
				);
			}
		}
		return true;
	} catch (err) {
		throw new Error(err);
	}
};

const enableByCategory = async (categories) => {
	try {
		let allLevel1Categories = categories
			.filter((category) => category.level == 1)
			.map((e) => e.cat_id);
		let level2Categories = categories
			.filter((category) => category.level == 2)
			.map((e) => e.cat_id);
		let level3Categories = categories
			.filter((category) => category.level == 3)
			.map((e) => e.cat_id);
		let level4Categories = categories
			.filter((category) => category.level == 4)
			.map((e) => e.cat_id);

		if (allLevel1Categories.length > 0) {
			for (let category of allLevel1Categories) {
				let cateogryCount: any = {};
				let productIds = [];
				//     find all product related to level1 category

				let allProducts = await NewProduct.aggregate([
					{
						$match: {
							level1: ObjectId(category)
						}
					},
					{
						$project: {
							level1: 1,
							level2: 1,
							level3: 1,
							level4: 1
						}
					}
				]);
				allProducts.forEach((product) => {
					if (product?.level2 && !product?.level3 && !product?.level4) {
						if (!cateogryCount[product.level2.toString()]) {
							cateogryCount[product.level2.toString()] = 1;
						} else {
							cateogryCount[product.level2.toString()] += 1;
						}
					} else if (product?.level2 && product?.level3 && !product?.level4) {
						if (!cateogryCount[product.level3.toString()]) {
							cateogryCount[product.level3.toString()] = 1;
						} else {
							cateogryCount[product.level3.toString()] += 1;
						}
					} else if (product?.level2 && product.level3 && product.level4) {
						if (!cateogryCount[product.level4.toString()]) {
							cateogryCount[product.level4.toString()] = 1;
						} else {
							cateogryCount[product.level4.toString()] += 1;
						}
					}
					productIds.push(product._id);
				});

				const sum = Object.values(cateogryCount).reduce(
					(acc: any, val: any) => acc + val,
					0
				);
				let promisesArray: any = [];
				for (let cat in cateogryCount) {
					let updateSub = await SellerCategory.updateMany(
						{ _id: ObjectId(cat) },
						{
							$set: {
								status: 'active'
							},
							$inc: {
								productCount: cateogryCount[cat]
							}
						}
					);
					promisesArray.push(updateSub);
				}
				let updateProduct = await NewProduct.updateMany(
					{
						_id: { $in: productIds }
					},
					{
						$set: {
							status: 'active'
						}
					}
				);
				promisesArray.unshift(updateProduct);
				let result = Promise.all(promisesArray).then((res) => {});
			}
		}

		if (level2Categories.length > 0) {
			for (let index = 0; index < level2Categories.length; index++) {
				let category = level2Categories[index];
				let cateogryCount: any = {};
				let productIds = [];
				//     find all product related to level1 category

				let allProducts = await NewProduct.aggregate([
					{
						$match: {
							level2: ObjectId(category)
						}
					},
					{
						$project: {
							level1: 1,
							level2: 1,
							level3: 1,
							level4: 1
						}
					}
				]);
				allProducts.forEach((product) => {
					if (product?.level2 && !product?.level3 && !product?.level4) {
						if (!cateogryCount[product.level2.toString()]) {
							cateogryCount[product.level2.toString()] = 1;
						} else {
							cateogryCount[product.level2.toString()] += 1;
						}
					} else if (product?.level2 && product?.level3 && !product?.level4) {
						if (!cateogryCount[product.level3.toString()]) {
							cateogryCount[product.level3.toString()] = 1;
						} else {
							cateogryCount[product.level3.toString()] += 1;
						}
					} else if (product?.level2 && product.level3 && product.level4) {
						if (!cateogryCount[product.level4.toString()]) {
							cateogryCount[product.level4.toString()] = 1;
						} else {
							cateogryCount[product.level4.toString()] += 1;
						}
					}
					productIds.push(product._id);
				});

				const sum = Object.values(cateogryCount).reduce(
					(acc: any, val: any) => acc + val,
					0
				);
				let promisesArray: any = [];
				for (let cat in cateogryCount) {
					let updateSub = await SellerCategory.updateMany(
						{ _id: ObjectId(cat) },
						{
							$set: {
								status: 'active'
							},
							$inc: {
								productCount: cateogryCount[cat]
							}
						}
					);
					promisesArray.push(updateSub);
				}
				let updateProduct = await NewProduct.updateMany(
					{
						_id: { $in: productIds }
					},
					{
						$set: {
							status: 'active'
						}
					}
				);
				promisesArray.unshift(updateProduct);
				let result = Promise.all(promisesArray).then((res) => {});
			}
		}

		// update level3Categories
		if (level3Categories.length > 0) {
			for (let index = 0; index < level3Categories.length; index++) {
				let category = level3Categories[index];
				let cateogryCount: any = {};
				let productIds = [];
				//     find all product related to level1 category

				let allProducts = await NewProduct.aggregate([
					{
						$match: {
							level3: ObjectId(category)
						}
					},
					{
						$project: {
							level1: 1,
							level2: 1,
							level3: 1,
							level4: 1
						}
					}
				]);
				allProducts.forEach((product) => {
					if (product?.level2 && !product?.level3 && !product?.level4) {
						if (!cateogryCount[product.level2.toString()]) {
							cateogryCount[product.level2.toString()] = 1;
						} else {
							cateogryCount[product.level2.toString()] += 1;
						}
					} else if (product?.level2 && product?.level3 && !product?.level4) {
						if (!cateogryCount[product.level3.toString()]) {
							cateogryCount[product.level3.toString()] = 1;
						} else {
							cateogryCount[product.level3.toString()] += 1;
						}
					} else if (product?.level2 && product.level3 && product.level4) {
						if (!cateogryCount[product.level4.toString()]) {
							cateogryCount[product.level4.toString()] = 1;
						} else {
							cateogryCount[product.level4.toString()] += 1;
						}
					}
					productIds.push(product._id);
				});

				const sum = Object.values(cateogryCount).reduce(
					(acc: any, val: any) => acc + val,
					0
				);
				let promisesArray: any = [];
				for (let cat in cateogryCount) {
					let updateSub = await SellerCategory.updateMany(
						{ _id: ObjectId(cat) },
						{
							$inc: {
								productCount: cateogryCount[cat]
							},
							$set: {
								status: 'active'
							}
						}
					);
					promisesArray.push(updateSub);
				}
				let updateProduct = await NewProduct.updateMany(
					{
						_id: { $in: productIds }
					},
					{
						$set: {
							status: 'active'
						}
					}
				);
				promisesArray.unshift(updateProduct);
				let result = Promise.all(promisesArray).then((res) => {});
			}
		}

		// upadate level4categories
		if (level4Categories.length > 0) {
			// update level4categories related Products
			for (let index = 0; index < level4Categories.length; index++) {
				let cat_id = level4Categories[index];
				let updatedProductsCount = await NewProduct.updateMany(
					{
						level4: cat_id,
						mannualSchedule: null,
						scheduleBy: { $ne: 'product' }
					},
					{
						$set: {
							status: 'active'
						}
					}
				);
				let productCount = updatedProductsCount?.nModified || 0;
				if (productCount > 0) {
					let levelUpdate = await SellerCategory.updateMany(
						{ _id: ObjectId(cat_id) },
						{ $inc: { productCount: productCount } }
					);
				}
				await SellerCategory.updateMany(
					{ _id: cat_id },
					{
						$set: {
							status: 'active'
						}
					}
				);
			}
		}

		return true;
	} catch (err) {
		throw new Error(err);
	}
};

export const forceDisable = async (data) => {
	try {
		let { startDateTime, endDateTime, product, category } = data;

		// product is a object of productId and lower level categoryId and  level of that category
		// category is a object of categoryId and lower level of category
		let updateProducts;
		let updateProductLevel2category: any;
		let updateProductLevel3category: any;
		let updateProductLevel4category: any;
		if (product?.id) {
			let { id, level, category } = product;

			let updateProduct = await NewProduct.findOneAndUpdate(
				{
					_id: id
				},
				{
					$set: {
						mannualSchedule: endDateTime,
						status: 'inactive'
					}
				},
				{ returnOriginal: false }
			);

			if (updateProduct?.level2 && !updateProduct.level3 && !updateProduct.level4) {
				await SellerCategory.updateOne(
					{ _id: updateProduct?.level2 },
					{ $inc: { productCount: -1 } }
				);
			} else if (updateProduct.level3 && !updateProduct.level4) {
				await SellerCategory.updateOne(
					{ _id: updateProduct.level3 },
					{ $inc: { productCount: -1 } }
				);
			} else {
				await SellerCategory.updateOne(
					{ _id: updateProduct.level4 },
					{ $inc: { productCount: -1 } }
				);
			}
		}

		if (category) {
			if (category.level == 1) {
				let categoryId = category.cat_id;
				let updateSub = await SellerCategory.updateMany(
					{ _id: ObjectId(categoryId) },
					{
						$set: {
							status: 'inactive',
							productCount: 0,
							mannualSchedule: endDateTime
						}
					}
				);
				// update set ProductStatus  inactive
				let productUpdate = await NewProduct.updateMany(
					{
						level1: categoryId
					},
					{
						$set: {
							status: 'inactive'
						}
					}
				);
			}

			if (category.level == 2) {
				let cat_id = category.cat_id;

				let subCategory = await SellerCategory.updateMany(
					{
						level2: cat_id
					},
					{
						$set: {
							status: 'inactive',
							productCount: 0,
							mannualSchedule: endDateTime
						}
					}
				);

				let updateProductsInfo = await NewProduct.updateMany(
					{
						level2: cat_id,
						level3: { $exists: false },
						level4: { $exists: false }
					},
					{
						$set: {
							mannualSchedule: endDateTime,
							status: 'inactive'
						}
					}
				);

				let updatedProductsCount = updateProductsInfo.nModified || 0;
				if (updatedProductsCount > 0) {
					let levelUpdate = await SellerCategory.updateMany(
						{ _id: ObjectId(cat_id) },

						{ $inc: { productCount: -updatedProductsCount } }
					);
				}
				await SellerCategory.updateMany(
					{ _id: cat_id },
					{
						$set: {
							status: 'inactive',
							mannualSchedule: endDateTime
						}
					}
				);

				await NewProduct.updateMany(
					{
						level2: cat_id
					},
					{
						$set: {
							mannualSchedule: endDateTime,
							status: 'inactive'
						}
					}
				);
			}
			if (category.level == 3) {
				let cat_id = category.cat_id;

				let subCategory = await SellerCategory.updateMany(
					{
						level3: cat_id
					},
					{
						$set: {
							status: 'inactive',
							productCount: 0,
							mannualSchedule: endDateTime
						}
					}
				);

				let updatedProductsInfo = await NewProduct.updateMany(
					{
						level3: cat_id,
						level4: { $exists: false },

						scheduleBy: { $ne: 'product' }
					},
					{
						$set: {
							mannualSchedule: endDateTime,
							status: 'inactive'
						}
					}
				);

				let updatedProductsCount = updatedProductsInfo.nModified || 0;
				if (updatedProductsCount > 0) {
					let levelUpdate = await SellerCategory.updateMany(
						{ _id: ObjectId(cat_id) },
						{ $inc: { productCount: -updatedProductsCount } }
					);
				}
				await SellerCategory.updateMany(
					{ 'productCategory._id': cat_id },
					{
						$set: {
							status: 'inactive',
							mannualSchedule: endDateTime
						}
					},
					{
						arrayFilters: [{ 'elem.id': cat_id }]
					}
				);

				await NewProduct.updateMany(
					{
						level3: cat_id
					},
					{
						$set: {
							mannualSchedule: endDateTime,
							status: 'inactive'
						}
					}
				);
			}
			if (category.level == 4) {
				let cat_id = category.id;
				let updatedProductsCount = await NewProduct.updateMany(
					{
						level4: cat_id
					},
					{
						$set: {
							mannualSchedule: endDateTime,
							status: 'inactive'
						}
					}
				);
				let productCount = updatedProductsCount?.nModified || 0;
				if (productCount > 0) {
					let levelUpdate = await SellerCategory.updateMany(
						{ _id: ObjectId(cat_id) },
						{ $inc: { productCount: -productCount } }
					);
				}
				await SellerCategory.updateMany(
					{ _id: cat_id },
					{
						$set: {
							status: 'inactive',
							mannualSchedule: endDateTime
						}
					}
				);
			}

			return true;
		}
	} catch (err) {
		throwError;
	}
};
// REMOVE DAILY AND WEEKLY SCHEDULE PARTICULAR PRODUCT AND CATEGORY
export const removeDailyAndWeeklySchedule = async (data) => {
	try {
		let { products, category } = data;

		if (products.length) {
			let removeDailyAndWeeklyScheduleFromProducts = await Timing.updateMany({
				$pull: {
					product: { $in: products }
				}
			});
		}
		if (category.length) {
			let level2Categories = category.filter((cate) => cate.level == 2).map((e) => e.cat_id);
			let level3Categories = category.filter((cate) => cate.level == 3).map((e) => e.cat_id);
			let level4Categories = category.filter((cate) => cate.level == 4).map((e) => e.cat_id);
			if (level2Categories.length) {
				let removeDailyAndWeeklyScheduleFromCategory = await Timing.updateMany({
					$pull: {
						category: { $in: level2Categories }
					}
				});
			}
			if (level3Categories.length) {
				let removeDailyAndWeeklyScheduleFromCategory = await Timing.updateMany({
					$pull: {
						category: { $in: level3Categories }
					}
				});
			}
			if (level4Categories.length) {
				let removeDailyAndWeeklyScheduleFromCategory = await Timing.updateMany({
					$pull: {
						category: { $in: level4Categories }
					}
				});
			}
		}
	} catch (e) {
		throw 404;
	}
};

// remove manually schedule  from category and products as on seller request
export const removeManuallySchedule = async (data) => {
	try {
		let { product, category } = data;

		// product is a object of productId and lower level categoryId and  level of that category
		// category is a object of categoryId and level of that category
		const today = new Date();
		if (product?.id) {
			let { id, categoryId, level } = product;

			let activate = false;
			//  does the product require activation------- activate

			let allSlotRelatedToProduct = await Timing.aggregate([
				{
					$match: {
						products: id
					}
				}
			]);

			if (allSlotRelatedToProduct[0]) {
				let currentDay = DateFns.getDay(today);
				let currentminutes: any = DateFns.getMinutes(today);
				let currenthour = DateFns.getHours(today);
				currenthour = +(currenthour < 10 ? '0' + currenthour : currenthour);

				currentminutes = currentminutes < 10 ? '0' + currentminutes : currentminutes;
				let currentTime = currenthour.toString() + ':' + currentminutes.toString();

				if (allSlotRelatedToProduct[0].durationType == 'week') {
					let findTodaySchedule = allSlotRelatedToProduct.filter(
						(slot) =>
							slot.fullyEnableDays.includes(currentDay) &&
							slot.startTime <= currentTime &&
							slot.endTime > currentTime
					);
					if (findTodaySchedule.length) {
						activate = true;
					}
				}
				if (allSlotRelatedToProduct[0].durationType == 'daily') {
					let findTodaySchedule = allSlotRelatedToProduct.filter(
						(slot) => slot.startTime <= currentTime && slot.endTime > currentTime
					);
					if (findTodaySchedule.length) {
						activate = true;
					}
				}
			} else {
				activate = true;
			}
			let updateProduct = await NewProduct.findOneAndUpdate(
				{
					_id: id
				},
				{
					$set: {
						mannualSchedule: null,
						status: activate ? 'active' : 'inactive'
					}
				}
			);

			if (activate) {
				if (updateProduct.level2 && !updateProduct.level3 && !updateProduct.level4) {
					await SellerCategory.updateOne(
						{ _id: updateProduct.level2 },
						{ $inc: { productCount: -1 } }
					);
				} else if (updateProduct.level3 && !updateProduct.level4) {
					await SellerCategory.updateOne(
						{ _id: updateProduct.level3 },
						{ $inc: { productCount: -1 } }
					);
				} else {
					await SellerCategory.updateOne(
						{ _id: updateProduct.level4 },
						{ $inc: { productCount: -1 } }
					);
				}
			}
		}
		if (category) {
			let { cat_id, level } = category;

			let categoryId = cat_id;
			if (level == 1) {
				let removeManuallySchedule = await NewProduct.updateMany(
					{
						level1: categoryId
					},
					{
						$set: {
							status: 'active',
							mannualSchedule: null
						}
					}
				);

				let updateCategory: any = await SellerCategory.updateOne(
					{ _id: categoryId },
					{
						$set: {
							status: 'active',
							mannualSchedule: null
						}
					},
					{ returnOriginal: false } // return the updated document
				);

				updateCategory = await SellerCategory.findOne({ _id: categoryId });
				if (!updateCategory?.seller) {
					throwError(502);
				}
				//  productCount update
				if (updateCategory.seller) {
					// level 4
					let promisesArray: any = [];

					let categoryWithCount = await NewProduct.aggregate([
						{
							$match: {
								seller: ObjectId(updateCategory.seller),
								level1: ObjectId(updateCategory?._id)
							}
						},
						{
							$group: {
								_id: '$level4',
								count: { $sum: 1 }
							}
						}
					]);

					for (let cat of categoryWithCount) {
						try {
							let pro = await SellerCategory.updateOne(
								{ _id: cat._id },
								{
									$set: {
										productCount: cat.count
									}
								}
							);
							promisesArray.push(pro);
						} catch (err) {}
					}

					let categoryWithCountL3 = await NewProduct.aggregate([
						{
							$match: {
								seller: ObjectId(updateCategory.seller),
								level1: ObjectId(updateCategory?._id),
								level4: {
									$exists: false
								}
							}
						},
						{
							$group: {
								_id: '$level3',
								count: { $sum: 1 }
							}
						}
					]);

					for (let cat of categoryWithCountL3) {
						try {
							let pro = await SellerCategory.updateOne(
								{ _id: cat._id },
								{
									$set: {
										productCount: cat.count
									}
								}
							);
							promisesArray.push(pro);
						} catch (err) {}
					}

					let categoryWithCountl2 = await NewProduct.aggregate([
						{
							$match: {
								seller: ObjectId(updateCategory.seller),
								level1: ObjectId(updateCategory?._id),
								level3: {
									$exists: false
								},
								level4: {
									$exists: false
								}
							}
						},
						{
							$group: {
								_id: '$level2',
								count: { $sum: 1 }
							}
						}
					]);

					for (let cat of categoryWithCountl2) {
						try {
							let pro = await SellerCategory.updateOne(
								{ _id: cat._id },
								{
									$set: {
										productCount: cat.count
									}
								}
							);
							promisesArray.push(pro);
						} catch (err) {}
					}

					let result = Promise.all(promisesArray).then((res) => {});
				}
				return;
			}
			if (level === 2) {
				let removeSchedule = await NewProduct.updateMany(
					{ level2: categoryId, level3: { $exists: false }, level4: { $exists: false } },
					{
						$set: {
							status: 'active',
							mannualSchedule: null
						}
					}
				);
				let updatedProductCount = removeSchedule.nModified || 0;

				let updateCategory = await SellerCategory.updateOne(
					{ _id: categoryId },
					{
						$inc: { productCount: updatedProductCount },
						$set: {
							status: 'active',
							mannualSchedule: null
						}
					}
				);

				let subCategory = await SellerCategory.aggregate([
					{
						$match: {
							level2: categoryId
						}
					}
				]);

				for (let cat of subCategory) {
					if (cat.level == 4) {
						let modiProduct = await NewProduct.updateMany(
							{
								level4: cat._id
							},
							{
								$set: {
									mannualSchedule: null,
									status: 'active'
								}
							}
						);

						await SellerCategory.updateMany(
							{ _id: ObjectId(cat._id) },
							{
								$inc: {
									productCount: modiProduct?.nModified || 0
								},
								$set: {
									status: 'active',
									mannualSchedule: null
								}
							}
						);
					}
					if (cat.level == 3) {
						let modiProduct = await NewProduct.updateMany(
							{
								level3: cat._id,

								mannualSchedule: null
							},
							{
								$set: {
									status: 'active'
								}
							}
						);

						await SellerCategory.updateMany(
							{ _id: ObjectId(cat._id) },
							{
								$inc: {
									productCount: modiProduct?.nModified || 0
								},
								$set: { status: 'active' }
							}
						);
					}
				}
			}

			if (level == 3) {
				let subCategory = await SellerCategory.aggregate([
					{
						$match: {
							level3: ObjectId(categoryId)
						}
					}
				]);

				for (let cat of subCategory) {
					let modiProduct = await NewProduct.updateMany(
						{
							level4: cat._id,

							mannualSchedule: null
						},
						{
							$set: {
								status: 'active'
							}
						}
					);

					await SellerCategory.updateMany(
						{ _id: ObjectId(cat._id) },
						{
							$inc: {
								productCount: modiProduct?.nModified || 0
							},
							$set: { status: 'active' }
						}
					);
				}

				let updatedProductsInfo = await NewProduct.updateMany(
					{
						level3: categoryId,
						level4: { $exists: false },

						mannualSchedule: null
					},
					{
						$set: {
							status: 'active'
						}
					}
				);

				let updatedProductsCount = updatedProductsInfo.nModified || 0;
				if (updatedProductsCount > 0) {
					let levelUpdate = await SellerCategory.updateMany(
						{ _id: ObjectId(categoryId) },
						{ $inc: { productCount: updatedProductsCount } }
					);
				}

				await SellerCategory.updateMany(
					{ _id: categoryId },
					{
						$set: {
							status: 'active'
						}
					}
				);

				await NewProduct.updateMany(
					{
						level3: categoryId,

						scheduleBy: { $ne: 'product' },
						mannualSchedule: null
					},
					{
						$set: {
							status: 'active'
						}
					}
				);
			}
			if (level == 4) {
				let cat_id = categoryId;
				let updatedProductsCount = await NewProduct.updateMany(
					{
						level4: cat_id,
						mannualSchedule: null
					},
					{
						$set: {
							status: 'active'
						}
					}
				);
				let productCount = updatedProductsCount?.nModified || 0;
				if (productCount > 0) {
					let levelUpdate = await SellerCategory.updateMany(
						{ _id: ObjectId(cat_id) },
						{ $inc: { productCount: productCount } }
					);
				}
				await SellerCategory.updateMany(
					{ _id: cat_id },
					{
						$set: {
							status: 'active'
						}
					}
				);
			}
		}
	} catch (e) {
		throw 404;
	}
};

const removeManualScheduler = async () => {
	let currentDateTime = new Date();
	let allCategoriesneedToupdate = await Seller.aggregate([
		{
			$match: {
				mannualSchedule: { $lte: currentDateTime }
			}
		}
	]);
	let categories = allCategoriesneedToupdate;

	for (let category of categories) {
		if (category.level == 2) {
			let cat_id = category._id;

			let subCategory = await Seller.aggregate([
				{
					$match: {
						level2: ObjectId(cat_id)
					}
				}
			]);
			subCategory = subCategory;
			//  	for (let cat of subCategory) {
			for (let cat of subCategory) {
				if (cat.level == 4) {
					let modiProduct = await NewProduct.updateMany(
						{
							level4: cat_id,

							mannualSchedule: null,
							scheduleBy: { $ne: 'product' }
						},
						{
							$set: {
								status: 'active'
							}
						}
					);

					await SellerCategory.updateMany(
						{ 'productCategory._id': ObjectId(cat_id) },
						{
							$inc: {
								productCount: modiProduct?.nModified || 0
							},
							$set: { status: 'active' }
						}
					);
				}
				if (cat.level == 3) {
					let modiProduct = await NewProduct.updateMany(
						{
							level3: cat_id,

							mannualSchedule: null,
							scheduleBy: { $ne: 'product' }
						},
						{
							$set: {
								status: 'active'
							}
						}
					);

					await SellerCategory.updateMany(
						{ _id: ObjectId(cat_id) },
						{
							$inc: {
								productCount: modiProduct?.nModified || 0
							},
							$set: { status: 'active' }
						}
					);
				}

				let updateProductsInfo = await NewProduct.updateMany(
					{
						level2: cat_id,
						level3: { $exists: false },
						level4: { $exists: false },
						scheduleBy: { $ne: 'product' },
						mannualSchedule: null
					},
					{
						$set: {
							status: 'active'
						}
					}
				);
				let updatedProductsCount = updateProductsInfo.nModified || 0;
				if (updatedProductsCount > 0) {
					let levelUpdate = await SellerCategory.updateMany(
						{ _id: ObjectId(cat_id) },
						{
							$inc: {
								productCount: updatedProductsCount
							}
						}
					);
				}
				await SellerCategory.updateMany(
					{ _id: cat_id },
					{
						$set: {
							status: 'active'
						}
					}
				);

				await NewProduct.updateMany(
					{
						level2: cat_id,

						scheduleBy: { $ne: 'product' },
						mannualSchedule: null
					},
					{
						$set: {
							status: 'active'
						}
					}
				);
			}
		}
		if (category.level == 3) {
			let cat_id = category._id;

			let subCategory = await SellerCategory.aggregate([
				{
					$match: {
						level3: ObjectId(cat_id)
					}
				}
			]);

			subCategory = subCategory;
			for (let cat of subCategory) {
				let modiProduct = await NewProduct.updateMany(
					{
						level4: cat_id,

						mannualSchedule: null,
						scheduleBy: { $ne: 'product' }
					},
					{
						$set: {
							status: 'active'
						}
					}
				);

				await SellerCategory.updateMany(
					{ _id: ObjectId(cat_id) },
					{
						$inc: {
							productCount: modiProduct?.nModified || 0
						},
						$set: { status: 'active' }
					}
				);
			}

			let updatedProductsInfo = await NewProduct.updateMany(
				{
					level3: cat_id,
					level4: { $exists: false },

					mannualSchedule: null,
					scheduleBy: { $ne: 'product' }
				},
				{
					$set: {
						status: 'active'
					}
				}
			);

			let updatedProductsCount = updatedProductsInfo.nModified || 0;
			if (updatedProductsCount > 0) {
				let levelUpdate = await SellerCategory.updateMany(
					{ _id: ObjectId(cat_id) },
					{ $inc: { productCount: updatedProductsCount } }
				);
			}
			await SellerCategory.updateMany(
				{ _id: cat_id },
				{
					$set: {
						status: 'active'
					}
				}
			);

			await NewProduct.updateMany(
				{
					level3: cat_id,

					scheduleBy: { $ne: 'product' },
					mannualSchedule: null
				},
				{
					$set: {
						status: 'active'
					}
				}
			);
		}
		if (category.level == 4) {
			let cat_id = category._id;
			let updatedProductsCount = await NewProduct.updateMany(
				{
					level4: cat_id,
					mannualSchedule: null,
					scheduleBy: { $ne: 'product' }
				},
				{
					$set: {
						status: 'active'
					}
				}
			);
			let productCount = updatedProductsCount?.nModified || 0;
			if (productCount > 0) {
				let levelUpdate = await SellerCategory.updateMany(
					{ _id: ObjectId(cat_id) },
					{ $inc: { productCount: productCount } }
				);
			}
			await SellerCategory.updateMany(
				{ _id: cat_id },
				{
					$set: {
						status: 'active'
					}
				}
			);
		}
	}

	//    productUpdate
	let productsIdsArrays = [];
	let saveAllLeafCategoriesWithProductCount: any = {};
	let productUpdates = await NewProduct.find({
		mannualSchedule: { $lte: currentDateTime }
	}).select('level2 level3 level4');

	productUpdates.forEach((product) => {
		if (product?.level2 && !product?.level3 && !product?.level4) {
			if (!saveAllLeafCategoriesWithProductCount[product.level2.toString()]) {
				saveAllLeafCategoriesWithProductCount[product.level2.toString()] = 1;
			} else {
				saveAllLeafCategoriesWithProductCount[product.level2.toString()] =
					saveAllLeafCategoriesWithProductCount[product.level2.toString()] += 1;
			}
		} else if (product?.level2 && product?.level3 && !product?.level4) {
			if (!saveAllLeafCategoriesWithProductCount[product.level3.toString()]) {
				saveAllLeafCategoriesWithProductCount[product.level3.toString()] = 1;
			} else {
				saveAllLeafCategoriesWithProductCount[product.level3.toString()] =
					saveAllLeafCategoriesWithProductCount[product.level2.toString()] += 1;
			}
		} else if (product?.level2 && product.level3 && product.level4) {
			if (!saveAllLeafCategoriesWithProductCount[product.level4.toString()]) {
				saveAllLeafCategoriesWithProductCount[product.level4.toString()] = 1;
			} else {
				saveAllLeafCategoriesWithProductCount[product.level4.toString()] =
					saveAllLeafCategoriesWithProductCount[product.level2.toString()] += 1;
			}
		}
		productsIdsArrays.push(ObjectId(product._id));
	});

	let updatedProducts = await NewProduct.updateMany(
		{ _id: { $in: productsIdsArrays } },
		{
			$set: {
				mannualSchedule: null,
				status: 'active'
			}
		}
	);
	for (let cat in saveAllLeafCategoriesWithProductCount) {
		let sellerUpdate = await SellerCategory.updateMany(
			{ _id: ObjectId(cat) },
			{
				$inc: {
					productCount: saveAllLeafCategoriesWithProductCount[cat]
				}
			}
		);
	}
	return true;
};

//  get all scheduled slots of categories
export const getScheduleOfCategories = async (data) => {
	try {
		let { category, day } = data;

		let result = await Timing.find(
			{
				'categories.cat_id': category
			},
			{ startTime: 1, endTime: 1, durationType: 1, fullyEnableDays: 1 }
		);
		if (result[0]?.durationType === 'daily') {
			let startTime = result.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));

			let endTime = result.sort((a, b) => (b.endTime < a.endTime ? 1 : -1))[0].endTime;

			return {
				startTime: startTime[0].startTime,
				...findFirstSlotStartTimeAndLastSlotEndTime(startTime),
				durationType: result[0].durationType
			};
		} else if (result[0]?.durationType === 'week') {
			let currentDay = day ? day : new Date().getDay();
			let currentDaySlots = result
				.filter((a) => a.fullyEnableDays.includes(day))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let sundaySlots = result
				.filter((a) => a.fullyEnableDays.includes(0))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let mondaySlots = result
				.filter((a) => a.fullyEnableDays.includes(1))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let tuesdaySlots = result
				.filter((a) => a.fullyEnableDays.includes(2))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let wednesdaySlots = result
				.filter((a) => a.fullyEnableDays.includes(3))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let thursdaySlots = result
				.filter((a) => a.fullyEnableDays.includes(4))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let fridaySlots = result
				.filter((a) => a.fullyEnableDays.includes(5))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let saturdaySlots = result
				.filter((a) => a.fullyEnableDays.includes(6))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));

			return {
				slots: currentDaySlots,
				...findFirstSlotStartTimeAndLastSlotEndTime(currentDaySlots),
				durationType: result[0].durationType,
				allDaysSlots: {
					sunday: {
						slots: sundaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(sundaySlots)
					},
					monday: {
						slots: mondaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(mondaySlots)
					},
					tuesday: {
						slots: tuesdaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(tuesdaySlots)
					},
					wednesday: {
						slots: wednesdaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(wednesdaySlots)
					},
					thursday: {
						slots: thursdaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(thursdaySlots)
					},
					friday: {
						slots: fridaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(fridaySlots)
					},
					saturday: {
						slots: saturdaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(saturdaySlots)
					}
				}
			};
		}
	} catch (err) {
		throw new Error(err);
	}
};

const findFirstSlotStartTimeAndLastSlotEndTime = (arrayOfSlots) => {
	try {
		let firstSlotStartTime = 2359;
		let lastSlotEndTime = 0;
		arrayOfSlots.forEach((slot) => {
			if (slot.startTime < firstSlotStartTime) {
				firstSlotStartTime = slot.startTime;
			}
			if (slot.endTime > lastSlotEndTime) {
				lastSlotEndTime = slot.endTime;
			}
		});

		return { firstSlotStartTime: firstSlotStartTime, lastSlotEndTime: lastSlotEndTime };
	} catch (err) {
		throw new Error(err);
	}
};
export const getScheduleOfProducts = async (data) => {
	try {
		let { product, day, categoryId } = data;
		let category = ObjectId(categoryId);

		product = ObjectId(product);
		let result = await Timing.find(
			{
				$or: [{ product: product }, { 'category.cat_id': category }]
			},
			{ startTime: 1, endTime: 1, durationType: 1, fullyEnableDays: 1 }
		);

		if (result[0]?.durationType === 'daily') {
			let startTime = result.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));

			let endTime = result.sort((a, b) => (b.endTime > a.endTime ? 1 : -1))[0].endTime;
			// if (!result.length) {
			// 	return [];
			// } else {
			return {
				startTime: startTime[0].startTime,
				...findFirstSlotStartTimeAndLastSlotEndTime(startTime),
				durationType: result[0].durationType
			};
		} else if (result[0]?.durationType === 'week') {
			let currentDay = day ? day : new Date().getDay();
			let currentDaySlots = result
				.filter((a) => a.fullyEnableDays.includes(day))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let sundaySlots = result
				.filter((a) => a.fullyEnableDays.includes(0))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let mondaySlots = result
				.filter((a) => a.fullyEnableDays.includes(1))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let tuesdaySlots = result
				.filter((a) => a.fullyEnableDays.includes(2))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let wednesdaySlots = result
				.filter((a) => a.fullyEnableDays.includes(3))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let thursdaySlots = result
				.filter((a) => a.fullyEnableDays.includes(4))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let fridaySlots = result
				.filter((a) => a.fullyEnableDays.includes(5))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
			let saturdaySlots = result
				.filter((a) => a.fullyEnableDays.includes(6))
				.sort((a, b) => (a.startTime < b.startTime ? 1 : -1));

			return {
				slots: currentDaySlots,
				...findFirstSlotStartTimeAndLastSlotEndTime(currentDaySlots),
				durationType: result[0].durationType,
				allDaysSlots: {
					sunday: {
						slots: sundaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(sundaySlots)
					},
					monday: {
						slots: mondaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(mondaySlots)
					},
					tuesday: {
						slots: tuesdaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(tuesdaySlots)
					},
					wednesday: {
						slots: wednesdaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(wednesdaySlots)
					},
					thursday: {
						slots: thursdaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(thursdaySlots)
					},
					friday: {
						slots: fridaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(fridaySlots)
					},
					saturday: {
						slots: saturdaySlots,
						...findFirstSlotStartTimeAndLastSlotEndTime(saturdaySlots)
					}
				}
			};
		}
	} catch (err) {
		throw new Error(err);
	}
};

function convertTo24Hour(timeStr: string): string {
	const [time, period] = timeStr.split(' ');
	let [hours, minutes] = time.split(':');

	if (period === 'PM' && hours !== '12') {
		hours = (parseInt(hours, 10) + 12).toString();
	} else if (hours === '12' && period === 'AM') {
		hours = '00';
	}

	// Pad single-digit hours and minutes with a leading zero if necessary
	if (hours.length === 1) {
		hours = '0' + hours;
	}
	if (minutes.length === 1) {
		minutes = '0' + minutes;
	}
	let timeN = `${hours}:${minutes}`;

	return timeN;
}
function getDayIndex(day: string): number {
	const daysOfWeek: string[] = [
		'sunday',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday'
	];
	return daysOfWeek.indexOf(day.toLowerCase());
}

export const disableOrderRejectedProducts = async (data: any) => {
	const { endDateTime, products } = data;

	try {
		const promises = products.map(async (productId) => {
			const product = await NewProduct.findOne({ _id: productId });

			if (product) {
				const { _id } = product;

				const updateProduct = await NewProduct.findOneAndUpdate(
					{ _id: _id },
					{
						$set: {
							mannualSchedule: new Date(endDateTime),
							status: 'inactive'
						}
					},
					{ returnOriginal: false }
				);

				if (updateProduct?.level2 && !updateProduct.level3 && !updateProduct.level4) {
					await SellerCategory.updateOne(
						{ _id: updateProduct?.level2 },
						{ $inc: { productCount: -1 } }
					);
				} else if (updateProduct.level3 && !updateProduct.level4) {
					await SellerCategory.updateOne(
						{ _id: updateProduct.level3 },
						{ $inc: { productCount: -1 } }
					);
				} else if (updateProduct.level4) {
					await SellerCategory.updateOne(
						{ _id: updateProduct.level4 },
						{ $inc: { productCount: -1 } }
					);
				}
			}
		});

		await Promise.all(promises);

		return { success: true, message: 'Products disabled successfully' };
	} catch (error) {
		return { success: false, message: 'Error disabling products', error };
	}
};
