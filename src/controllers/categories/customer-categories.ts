import { Types, model, Schema } from 'mongoose';
import { ICategory } from '../../models/category/category';
import * as dateFns from 'date-fns';

const Category = model<ICategory>('Category');
import { ICustomer } from '../../models/customer/customer';
const Customer = model<ICustomer>('Customer');
import { throwError } from '../../helpers/throw-errors';
import { createAdminNotification } from '../../helpers/notifications/admin';
import { IUser } from '../../models/user/user';
import { INotification } from '../../models/notification/notification';
import { IOrder } from '../../models/order/order';
import { sendAdminNotification } from '../../helpers/notifications/notification';
import { IWishlist } from '../../models/customer/wishlist';
import { createSellerSession } from '../seller/session';
import { ISeller } from '../../models/customer/seller';
import { IProduct } from '../../models/seller/product';
import { buildCategoryTree, withCanProductAddCategoryTree } from '../../helpers/discount';
import { ISellerCategory } from '../../models/seller/seller-category';

const User = model<IUser>('User');
const Notification = model<INotification>('Notification');
const Order = model<IOrder>('Order');
const Wishlist = model<IWishlist>('Wishlist');
const Seller = model<ISeller>('NewCustomer');
const Product = model<IProduct>('NewProduct');
const ObjectId = Types.ObjectId;
const SellerCategory = model<ISellerCategory>('SellerCategory');
export const getCategoryTree = async (sellerId) => {
	try {
		let sellerCategories = await SellerCategory.find({ seller: sellerId });
		let results = buildCategoryTree(sellerCategories);
		return results;
		// let categoryTree: any = await Seller.findById('6420c898030bcb93b2e7fc59', {
		// 	productCategory: 1
		// }).lean();

		// return categoryTree.productCategory;
	} catch (error) {
		throw error;
	}
};

// const prepareCategories = (seller, categories) => {
// 	seller.productCategory = categories;
// 	seller.level4 = categories.reduce((all, l1) => {
// 		if (l1 && l1.sub && l1.sub.length) {
// 			for (let l2 of l1.sub) {
// 				if (l2 && l2.sub && l2.sub.length) {
// 					for (let l3 of l2.sub) {
// 						if (l3 && l3.sub && l3.sub.length) {
// 							all.push(...l3.sub);
// 						}
// 					}
// 				}
// 			}
// 		}
// 		return all;
// 	}, []);
// };

export const selectCategoryByCustomer = async (data, session, sessionID) => {
	try {
		if (!data || !data.userId || !data.selectedCategories || !data.selectedCategories.length) {
			throwError(400);
		}

		let seller = await Seller.findById(data.userId, { _id: 1 }).populate({
			path: 'productCategory',
			select: 'name globalCatID',
			match: {
				level: 1
			},
			populate: {
				path: 'globalCatID',
				select: 'commission insurance',
				options: {
					lean: true
				}
			}
		});

		if (!seller) {
			throwError(404);
		}

		// If user has already selected categories, update the categories that are selected with the new information
		// If user has not selected categories, create new categories
		const promises = data.selectedCategories.map((category) => {
			let existingCategory = seller.productCategory.find(
				(cat) =>
					(cat.globalCatID as ICategory)?._id.toString() ===
					category.globalCatID.toString()
			);
			if (existingCategory) {
				return SellerCategory.updateOne(
					{ _id: existingCategory._id },
					{
						$set: {
							status: 'active',
							commission: (existingCategory.globalCatID as ICategory).commission,
							insurance: (existingCategory.globalCatID as ICategory).insurance,
							insured: category.insured
						}
					}
				);
			} else {
				const newCategory = new SellerCategory({
					seller: data.userId,
					...category
				});
				return newCategory.save();
			}
		});

		promises.push(
			SellerCategory.updateMany(
				{
					seller: data.userId,
					level: 1,
					globalCatID: { $nin: data.selectedCategories.map((cat) => cat.globalCatID) }
				},
				{
					$set: {
						status: 'inactive'
					}
				}
			)
		);

		let parentCategories = data.selectedCategories.map((cat) => cat.globalCatID);

		seller.parentCategory = parentCategories;
		seller.updatedBy = data?.userId;
		seller.kycStage = 'CategorySelection';
		promises.push(seller.save());

		await Promise.all(promises);

		return {
			message: 'Category selection successful'
		};
	} catch (error) {
		throw error;
	}
};

const sendRegistrationNotifications = async (customer: any) => {
	try {
		const adminNotification = createAdminNotification('ADMIN_USER_REGISTERED', null, customer);
		sendAdminNotification(adminNotification);
	} catch (error) {
		console.error('Notification Error ', error);
	}
};

export const getSelectedCategories = async (sellerId) => {
	try {
		let categories: any = await SellerCategory.find({ seller: sellerId }).lean();

		let promises = categories.map(async (category) => {
			if (category.level == 2 || category.level == 3) {
				if (category.level == 2) {
					let hasSubCats = categories.find(
						(cat) => cat?.level2?.toString() === category._id.toString()
					);
					if (!hasSubCats) {
						let query = {
							seller: sellerId
						};
						query[`level${category.level}`] = category._id;
						let productCount = await Product.count(query);
						category.canAddSub = productCount == 0;
					} else {
						category.canAddSub = true;
					}
				} else if (category.level == 3) {
					let hasSubCats = categories.find(
						(cat) => cat?.level3?.toString() === category._id.toString()
					);
					if (!hasSubCats) {
						let query = {
							seller: sellerId
						};
						query[`level${category.level}`] = category._id;
						let productCount = await Product.count(query);
						category.canAddSub = productCount == 0;
					} else {
						category.canAddSub = true;
					}
				}
			}
		});

		await Promise.all(promises);

		let categoryTree = buildCategoryTree(categories);

		return categoryTree;
	} catch (error) {
		throw error;
	}
};
export const getSellerCategoryTree = async (user: any) => {
	try {
		let categoryTree: any = await SellerCategory.find({ seller: user._id }).lean();

		let newcategories = withCanProductAddCategoryTree(categoryTree);

		return newcategories;
	} catch (error) {
		throw error;
	}
};

//  this function is used to show categories in seller inventory page in buyerPage, it sends only those
// active categories that have least one product
export const getActiveCategoryTree = async (sellerId, query) => {
	try {
		const { level2, level3, level1, selectedCategory } = query;

		let categories: any = await SellerCategory.find({
			seller: sellerId,
			level: 1,
			status: 'active'
		})
			.sort({ position: 1 })
			.populate([
				{
					path: 'l1ProductCount',
					match: {
						status: 'active'
					},
					options: {
						sort: { position: 1 },
						lean: true
					}
				},
				{
					path: 'l2Cats',
					match: {
						status: 'active',
						level: 2
					},
					options: {
						sort: { position: 1 }
					},
					populate: [
						{
							path: 'l2ProductCount',
							match: {
								status: 'active'
							},
							options: {
								lean: true
							}
						},
						{
							path: 'l3Cats',
							match: {
								status: 'active',
								level: 3
							},
							options: {
								lean: true
							},
							populate: {
								path: 'l3ProductCount',
								match: {
									status: 'active'
								},
								options: {
									lean: true
								}
							}
						}
					]
				}
			])
			.lean();

		categories = categories.filter((cat) => cat.l1ProductCount > 0);
		if (selectedCategory) {
			categories.sort((a, b) => {
				if (a.globalCatID.toString() === selectedCategory.toString()) {
					return -1; // Move 'a' to the beginning
				} else if (b.globalCatID.toString() === selectedCategory.toString) {
					return 1; // Move 'b' to the beginning
				} else {
					return 0; // Keep the order unchanged
				}
			});
		}

		// Filter out all categories that have no products
		for (let l1 of categories) {
			for (let l2 of l1.l2Cats) {
				l2.sub = l2.l3Cats.filter((cat) => cat.l3ProductCount > 0);
				delete l2.l3Cats;
			}
			l1.sub = l1.l2Cats.filter((cat) => cat.l2ProductCount > 0);
			delete l1.l2Cats;
		}

		categories = categories.filter((cat) => cat.sub.length > 0);

		return categories;
	} catch (error) {
		throw error;
	}
};

export const updateSellerCategories = async (sellerId, data) => {
	let { level1, level2, level3, level, name } = data;

	if (!level || !level1 || !name) {
		throwError(404);
	}

	if (level == 3 && (!level2 || !level1)) {
		throwError(404);
	}
	if (level == 4 && (!level2 || !level3)) {
		throwError(404);
	}

	let category = {
		level,
		level1,
		...(level2 ? { level2 } : {}),
		...(level3 ? { level3 } : {}),
		name,
		seller: sellerId
	};

	let addCategory = new SellerCategory(category);
	await addCategory.save();
	let categories = await SellerCategory.aggregate([
		{
			$match: {
				seller: ObjectId(sellerId)
			}
		}
	]);
	return buildCategoryTree(categories);
};

export const deleteSellerCategory = async (sellerId, data) => {
	try {
		let { level, id, name } = data;

		let deleteCategory = await SellerCategory.deleteOne({
			seller: sellerId._id,
			name: data.name,
			_id: data.id
		});
		let categories = await SellerCategory.aggregate([
			{
				$match: {
					seller: ObjectId(sellerId._id)
				}
			}
		]);

		let newCategories = buildCategoryTree(categories);
		return newCategories;
	} catch (err) {
		throwError(501);
	}
};

export const getSellerDetails = async (sellerId, user, queryObj) => {
	try {
		let { latitude, longitude } = queryObj;
		sellerId = ObjectId(sellerId);
		const date = new Date();
		const day = +dateFns.format(date, 'i');

		let shopTimingProjection =
			day == 0
				? 'shopTiming.sunday'
				: day == 1
				? 'shopTiming.monday'
				: day == 2
				? 'shopTiming.tuesday'
				: day == 3
				? 'shopTiming.wednesday'
				: day == 4
				? 'shopTiming.thursday'
				: day == 5
				? 'shopTiming.friday'
				: 'shopTiming.saturday';

		let projection = {
			businessName: 1,
			priceTable: 1,
			contact: 1,
			shopPhotos: 1,
			addresses: 1,
			shopLocation: 1,
			rating: 1,
			orders: 1,
			packingTime: 1,
			'deliveryMode.selfdelivery.freeDeliveryAmount': 1,
			[shopTimingProjection]: 1,
			shopStatus: 1,
			managerNumber: 1
		};

		let sellers = await Seller.aggregate([
			{
				$geoNear: {
					near: { type: 'Point', coordinates: [+longitude, +latitude] },
					distanceField: 'distance'
				}
			},
			{
				$match: { _id: sellerId }
			},

			{
				$project: {
					distance: 1,
					averageDeliveryTime: {
						$add: [{ $multiply: ['$distance', 0.003] }, '$packingTime']
					},
					...projection
				}
			},
			{
				$lookup: {
					from: 'coupons',
					let: { sellerId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$or: [
												{ $in: ['$seller', ['$$sellerId']] },
												{ $eq: ['$seller', []] }
											]
										},
										{ $gt: ['$expiry', new Date()] }
									]
								}
							}
						}
					],
					as: 'coupons'
				}
			}
		]);
		let seller = sellers[0];
		if (!seller) {
			throwError(404);
		}

		return {
			...JSON.parse(JSON.stringify(seller)),
			totalOrders: seller?.orders?.total || 0,
			returnedOrders: seller?.orders?.returned || 0,
			returnRatio: seller?.orders?.total
				? ((seller?.orders?.returned || 0) * 100) / seller?.orders?.total
				: 0,
			totalReviews: (seller?.rating?.buyerCount || 0) + (seller?.rating?.riderCount || 0)
		};
	} catch (error) {
		throw error;
	}
};

export const updateCustomerCategories = async (categories, user, session) => {
	try {
		if (!categories || !user._id) {
			throwError(400);
		}

		let updateOperations = categories.map((category) => {
			return {
				updateOne: {
					filter: {
						_id: category._id
					},
					update: {
						$set: {
							name: category.name
						}
					}
				}
			};
		});

		await SellerCategory.bulkWrite(updateOperations);

		return categories;
	} catch (error) {
		throw error;
	}
};

export const addCategory = async (user, data) => {
	let { name, level, parentCatId } = data;
	if (!level || !parentCatId || !name) {
		throwError(404);
	}
	let newCategory: any = {
		...data,
		seller: user._id
	};

	if (level == 2) {
		newCategory.level1 = parentCatId;
	}
	if (level == 3) {
		let findParentCat = await SellerCategory.findOne({ _id: parentCatId });
		if (!findParentCat) {
			throwError(404);
		}
		newCategory.level1 = findParentCat.level1;
		newCategory.level2 = findParentCat._id;
	}
	if (level == 4) {
		let findParentCat = await SellerCategory.findOne({ _id: parentCatId });
		if (!findParentCat) {
			throwError(404);
		}
		newCategory.level1 = findParentCat.level1;
		newCategory.level2 = findParentCat.level2;
		newCategory.level3 = findParentCat._id;
	}

	let addCategory = new SellerCategory(newCategory);

	await addCategory.save();
};

export const getCustomerCategoryIds = async (userId: string) => {
	try {
		let result = await Seller.findOne(
			{
				_id: userId
			},
			'level4'
		).populate('level4', 'status');
		if (!result?.level4) {
			return [];
		}
		const level4 = ((result.level4 || []) as ICategory[])
			.filter((c) => c.status === 'active')
			.map((c) => c._id.toString());
		return level4;
	} catch (error) {
		throw error;
	}
};

export const getSellerRunningItems = async (id: string) => {
	try {
		const seller = await Seller.findById(id).select('runningItems');
		if (!seller) {
			throwError(404);
		}
		return seller.toJSON().runningItems || [];
	} catch (error) {
		throw error;
	}
};
