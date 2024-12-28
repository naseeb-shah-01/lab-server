import { throwError } from '../../helpers/throw-errors';
import { ICategory } from '../../models/category/category';
import { Request, Response } from 'express';
import { ISpecification } from '../../models/category/specification';
import { model, Types } from 'mongoose';
import { deletePrivateProps, getResults, getSkip, getSort } from '../../helpers/query';
import { createThumbWithBuffer } from '../../helpers/thumb';
import { IProduct } from '../../models/seller/product';
import { ICustomer } from '../../models/customer/customer';
import { createAdminNotification } from '../../helpers/notifications/admin';
import { INotification } from '../../models/notification/notification';
import { IUser } from '../../models/user/user';
import { sendAdminNotification } from '../../helpers/notifications/notification';
import { IOrder } from '../../models/order/order';
import { IPrice } from '../../models/seller/price';
import { ICart } from '../../models/customer/cart';
import { addDays, set } from 'date-fns';
import { IContact } from '../../models/customer/contact';
import { ISeller } from '../../models/customer/seller';
import { IRider } from '../../models/rider/rider';
import * as XLSX from 'xlsx';
import { CronJob } from 'cron';
import { ISellerCategory } from '../../models/seller/seller-category';
import { createHmac } from 'crypto';

const ObjectId = Types.ObjectId;
const Seller = model<ISeller>('NewCustomer');
const SellerCategory = model<ISellerCategory>('SellerCategory');
const Category = model<ICategory>('Category');
const NewProduct = model<IProduct>('NewProduct');
const Specification = model<ISpecification>('Specification');
const Customer = model<ICustomer>('Customer');
const User = model<IUser>('User');
const Notification = model<INotification>('Notification');
const Order = model<IOrder>('Order');
const Price = model<IPrice>('Price');
const Cart = model<ICart>('Cart');
const Contact = model<IContact>('Contact');
const Rider = model<IRider>('Rider');

export const validateProduct = async (
	req: Request,
	res: Response,
	data: IProduct,
	cb: (upload: boolean) => {},
	file: any
) => {
	if (!data || !data.level2) {
		//data.type removed
		res.errorRes(400);
		cb(false);
		return;
	} else {
		if (req.params.id) {
			let product = await NewProduct.findOne({
				_id: req.params.id,
				status: { $ne: 'deleted' }
			});
			if (!product) {
				res.errorRes(404);
				cb(false);
				return;
			}
			// if (product.type !== data.type) {
			// 	res.errorRes(400);

			// 	cb(false);
			// 	return;
			// }
		}

		if (data.type === 'single' && !data?.minPrice?.price) {
			res.errorRes(400);
			cb(false);
			return;
		}
		if (data.type === 'set' && data.sets) {
			for (const set of data.sets) {
				if (!set.price || !set.minimumOrderQuantity) {
					res.errorRes(400);
					cb(false);
					return;
				}
			}
		}
		cb(true);
		return;
	}
};

export const getParentCategory = async (user) => {
	try {
		let catIds = await Seller.findById(user?._id).select('productCategory');
		let level1Ids = catIds?.categories?.map((c) => c.l1);

		let category = await Category.find({
			level: 1,
			status: 'active',
			_id: { $in: level1Ids }
		})
			.select('name thumb')
			.lean();

		return category;
	} catch (error) {
		throw error;
	}
};

export const getSubcategory = async (level, parentId, user) => {
	try {
		if (isNaN(level)) {
			throwError(400);
		}

		let catIds = await Seller.findById(user?._id).select('categories level4');

		level = +level;

		let query: any = {
			level: level,
			status: 'active'
		};

		if (level == 2) {
			let ids = [];
			catIds?.categories.forEach((c1) => c1.sub.forEach((c2) => ids.push(c2.l2)));
			query._id = { $in: ids || [] };
			query.level1 = parentId;
		} else if (level == 3) {
			let ids = [];
			catIds?.categories.forEach((c1) =>
				c1.sub.forEach((c2) => c2.sub.forEach((c3) => ids.push(c3.l3)))
			);
			query._id = { $in: ids || [] };
			query.level2 = parentId;
		} else if (level == 4) {
			query._id = { $in: catIds?.level4 || [] };
			query.level3 = parentId;
		}

		let category = await Category.find(query).select('name thumb').lean();

		let specfication = await Specification.aggregate([
			{
				$match: {
					status: 'active',
					category: ObjectId(parentId)
				}
			},
			{
				$lookup: {
					from: 'specificationvalues',
					let: { specification: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$specification', '$$specification'] },
										{ $eq: ['$status', 'active'] }
									]
								}
							}
						}
					],
					as: 'values'
				}
			}
		]);

		let response = {
			category: category,
			specfication: specfication
		};

		return response;
	} catch (error) {
		throw error;
	}
};

export const getAllCategories = async (user) => {
	try {
		let customerCategories = await Seller.findById(user?._id).select('productCategory');

		let catIds = [];
		customerCategories?.categories?.forEach((c1) => {
			catIds.push(c1.l1);
			c1.sub.forEach((c2) => {
				catIds.push(c2.l2);
				c2.sub.forEach((c3) => {
					catIds.push(c3.l3);
					c3.sub.forEach((c4) => catIds.push(c4));
				});
			});
		});

		let query: any = {
			status: 'active',
			_id: { $in: catIds }
		};

		let category = await Category.find(query)
			.select('name thumb level level1 level2 level3')
			.lean();

		const categoryIds = category.map((c) => c._id);

		let specifications = await Specification.aggregate([
			{
				$match: {
					status: 'active',
					category: { $in: categoryIds }
				}
			},
			{
				$lookup: {
					from: 'specificationvalues',
					let: { specification: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$specification', '$$specification'] },
										{ $eq: ['$status', 'active'] }
									]
								}
							}
						}
					],
					as: 'values'
				}
			}
		]);

		let response = {
			category: category,
			specifications: specifications
		};

		return response;
	} catch (error) {
		throw error;
	}
};

export const getAllSpecifications = async (body, user) => {
	try {
		if (!body?.categories?.length) {
			throwError(400);
		}
		let categories = body.categories.map((c) => ObjectId(c));
		let specifications = await Specification.aggregate([
			{
				$match: {
					category: { $in: categories },
					status: 'active'
				}
			},
			{
				$lookup: {
					from: 'specificationvalues',
					let: { specification: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$specification', '$$specification'] },
										{ $eq: ['$status', 'active'] }
									]
								}
							}
						}
					],
					as: 'values'
				}
			},
			{
				$lookup: {
					from: 'categories',
					let: { cid: '$category' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$_id', '$$cid'] },
										{ $eq: ['$status', 'active'] }
									]
								}
							}
						},
						{
							$project: {
								level: 1
							}
						}
					],
					as: 'level'
				}
			},
			{
				$unwind: '$level'
			},
			{
				$project: {
					position: 1,
					status: 1,
					name: 1,
					values: 1,
					level: '$level.level'
				}
			}
		]);
		return specifications;
	} catch (error) {
		throw error;
	}
};

export const addProduct = async (data: any, files, user) => {
	try {
		data = deletePrivateProps(data);

		if (!data.thumbImages) {
			data.thumbImages = [];
		}

		if (files.length) {
			for (let file of files) {
				if (file.fieldname === 'images') {
					const thumb = await createThumbWithBuffer(file.location);
					var imageData = {
						image: file.location,
						thumb: thumb
					};
					data.thumbImages.push(imageData);
				}
			}
		}
		//  to make  hasProduct flag true related category
		data.createdBy = user?._id || null;
		data.seller = user?._id || null;
		let product = new NewProduct(data);
		await product.save();
		let categoryToIncreaseProductCount = data.level4
			? data.level4
			: data.level3
			? data.level3
			: data.level2;
		let levelOfCategory = data.level4 ? 4 : data.level3 ? 3 : 2;
		await increaseProductCountInCategory(
			categoryToIncreaseProductCount,
			levelOfCategory,
			data.seller
		);

		return product;
	} catch (error) {
		throw error;
	}
};

export const updateCategoryName = async (data) => {
	try {
		let category = await SellerCategory.updateOne(
			{ _id: data.id },
			{ $set: { name: data.name } }
		);
		let categoryFind = await SellerCategory.findOne({ _id: data.id });

		if (!category) {
			throwError(404);
		}

		return;
	} catch (error) {
		throwError(error);
	}
};

export const updateProduct = async (id: string, data: any, files, user) => {
	try {
		data = deletePrivateProps(data);

		if (!data.thumbImages) {
			data.thumbImages = [];
		}

		if (files.length) {
			for (let file of files) {
				if (file.fieldname === 'images') {
					const thumb = await createThumbWithBuffer(file.location);
					var imageData = {
						image: file.location,
						thumb: thumb
					};
					data.thumbImages.push(imageData);
				}
			}
		}

		data.updatedBy = user?._id || null;
		let product = await NewProduct.findByIdAndUpdate(
			id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();

		return product;
	} catch (error) {
		throw error;
	}
};
//  pending for discussion

export const getCategoryForSuggestions = async (data: any) => {
	const { level, searchQuery } = data;
	// if level  is eqaul to 1  parentId not required

	let dbQuery = {
		$match: {
			name: {
				$regex: searchQuery,
				$options: 'i'
			},
			level: level
		}
	};

	let projectQuery = {
		$project: {
			name: 1,
			level: 1
		}
	};

	let categories = await Category.aggregate([
		dbQuery,
		projectQuery,
		{
			$limit: 10
		}
	]);

	return categories;
};

export const changeProductStatus = async (
	id: string,
	status: 'active' | 'deleted' | 'inactive',
	data: any,
	user
) => {
	try {
		if (!status || !['active', 'inactive'].includes(status)) {
			throwError(400);
		}

		let product = await NewProduct.findOne({
			_id: id,
			status: { $ne: 'deleted' }
		}).populate({
			path: 'prices',
			match: { seller: user?._id }
		});

		if (!product) {
			throwError(404);
		}

		//Add data in prices collection if product is enabled for the first time

		product.status = status;
		await product.save();

		sendProductStatusNotifications(user?._id.toString(), product._id.toString());

		product = await NewProduct.findOne({
			_id: id,
			status: { $ne: 'deleted' }
		});

		return product;
	} catch (error) {
		throw error;
	}
};

export const changeSubProductStatus = async (
	id: string,
	level,
	status: string,
	data: any,
	user
) => {
	// 	try {
	// 		if (!status || !['active', 'inactive'].includes(status)) {
	// 			throwError(400);
	// 		}
	// 		let product = await Category.updateOne(
	// 			{
	// 				_id: id,
	// 				level: level
	// 			},
	// 			{
	// 				$set: { status: status }
	// 			}
	// 		);
	// 		level == 2
	// 			? data.props.sub.map(async (ele) => {
	// 					const id = ele.l3.name;
	// 					await Category.updateOne(
	// 						{ name: id },
	// 						{
	// 							status: status === 'active' ? 'active' : 'inactive'
	// 						}
	// 					);
	// 					ele.sub.map(async (item) => {
	// 						const id = item.name;
	// 						await NewProduct.updateOne(
	// 							{ name: id },
	// 							{
	// 								status: status === 'active' ? 'active' : 'inactive'
	// 							}
	// 						);
	// 					});
	// 			  })
	// 			: level == 3
	// 			? data.props.sub.map(async (ele) => {
	// 					const id = ele.l2.name;
	// 					await NewProduct.updateOne(
	// 						{ name: id },
	// 						{
	// 							status: status === 'active' ? 'active' : 'inactive'
	// 						}
	// 					);
	// 			  })
	// 			: null;
	// 		if (!product) {
	// 			throwError(404);
	// 		}
	// 		// sendProductStatusNotifications(user?._id.toString(), product._id.toString());
	// 		return product;
	// 	} catch (error) {
	// 		throw error;
	// 	}
};

export const sendProductStatusNotifications = async (sellerId: string, productId: string) => {
	try {
		const seller = await Seller.findById(sellerId).select('name businessName');
		const product = await NewProduct.findById(productId).select('name');
		const adminNotification = createAdminNotification(
			product.status === 'active' ? 'ADMIN_PRODUCT_ENABLED' : 'ADMIN_PRODUCT_DISABLED',
			null,
			{ seller, product }
		);
		sendAdminNotification(adminNotification);
	} catch (error) {
		console.error(error);
	}
};

export const getProductById = async (id: string, user) => {
	try {
		const product = await NewProduct.findOne({
			_id: id
		}).lean();

		if (!product) {
			throwError(404);
		}

		return product;
	} catch (error) {
		throw error;
	}
};

export const deleteProduct = async (id: string, user) => {
	try {
		let product = await NewProduct.findById(id);
		let categoryToDecreaseProductCount = product.level4
			? product.level4
			: product.level3
			? product.level3
			: product.level2;
		let levelOfCategory = product.level4 ? 4 : product.level3 ? 3 : 2;
		let deleteProduct = await NewProduct.deleteOne({
			_id: id
		});

		await decreaseProductCountInCategory(
			categoryToDecreaseProductCount,
			levelOfCategory,
			user._id
		);

		sendProductDeleteNotifications(product.seller.toString(), product._id.toString());

		return {
			status: 200,
			message: 'Product deleted successfully'
		};
	} catch (error) {
		throw error;
	}
};

const sendProductDeleteNotifications = async (sellerId: string, productId: string) => {
	try {
		const seller = await Seller.findById(sellerId).select('name businessName');
		const product = await NewProduct.findById(productId).select('name');
		const adminNotification = createAdminNotification('ADMIN_PRODUCT_DELETED', null, {
			seller,
			product
		});
		sendAdminNotification(adminNotification);
	} catch (error) {
		console.error(error);
	}
};

export const getPriceTable = async (user) => {
	try {
		const customer = await Seller.findOne({
			_id: user._id,
			status: 'active'
		})
			.populate('runningOrder')
			.select('priceTable runningOrder')
			.lean();

		const turnInOrderIds = await Order.distinct('_id', {
			seller: user._id,
			'currentStatus.status': 'placed',
			'accepted.status': { $ne: true },
			'cancelled.status': { $ne: true },
			'rejected.status': { $ne: true }
		});

		if (!customer) {
			throwError(404);
		}

		return { ...customer, turnInPending: !!turnInOrderIds.length };
	} catch (error) {
		throw error;
	}
};

export const updatePriceTable = async (body, user) => {
	try {
		if (!body.priceTable) {
			throwError(400);
		}

		const seller = await Seller.findOne({
			_id: user._id,
			status: 'active'
		}).select('priceTable');

		if (!seller) {
			throwError(404);
		}

		seller.priceTable = body.priceTable;

		seller.save();

		sendPriceTableUpdateNotification(seller._id);

		return seller;
	} catch (error) {
		throw error;
	}
};

const sendPriceTableUpdateNotification = async (sellerId) => {
	try {
		const seller = await Seller.findById(sellerId).select('name businessName');
		const adminNotification = createAdminNotification(
			'ADMIN_PRICE_TABLE_UPDATED',
			null,
			seller
		);
		sendAdminNotification(adminNotification);
	} catch (error) {
		console.error(error);
	}
};

export const getProductByCategoryAndLevel = async (level, category, user, queryObj) => {
	try {
		level = +level;

		const dbQuery1: any = {
			// status: 'active',
			seller: ObjectId(user._id)
		};

		const dbQuery2: any = {
			...(level === 1
				? { level1: ObjectId(category) }
				: level === 2
				? { level2: ObjectId(category) }
				: level === 3
				? { level3: ObjectId(category) }
				: { level4: ObjectId(category) })
		};

		let products = await NewProduct.aggregate([
			{
				$match: {
					...dbQuery1,
					...dbQuery2
				}
			},
			{
				$facet: {
					data: [
						{
							$project: {
								name: 1,
								description: 1,
								thumbImages: 1,
								minPrice: 1,
								status: 1,
								veg: 1,
								level1: 1,
								level2: 1,
								level3: 1
							}
						},
						{
							$sort: getSort(queryObj, 'name', 1)
						},
						{
							$skip: getSkip(queryObj, queryObj.limit)
						},
						{
							$limit: +queryObj.limit
						}
					],
					count: [
						{
							$count: 'total'
						}
					]
				}
			}
		]);

		return {
			data: products[0].data,
			total: products[0].count?.[0]?.total || 0
		};
	} catch (error) {
		throw error;
	}
};

export const getDisabledProducts = async (queryObj, user) => {
	try {
		const dbQuery: any = {
			status: 'inactive',
			seller: user?._id
		};

		const populations = [
			{
				path: 'product',
				select: 'name thumbImages'
			}
		];

		const products = await getResults(
			queryObj,
			NewProduct,
			dbQuery,
			null,
			'name',
			'name',
			1,
			15,
			populations
		);

		return products;
	} catch (error) {
		throw error;
	}
};

// disable produtcs
// const getDisabledSubProducts = async () => {
// 	try {
//         // level = +level;

// 		const dbQuery: any = {
// 			status: 'inactive',
// 			// seller: user?._id
// 		};
//         // const dbQuery2: any = {
// 		// 	...(level === 1
// 		// 		? { 'product.level1': ObjectId(category) }
// 		// 		: level === 2
// 		// 		? { 'product.level2': ObjectId(category) }
// 		// 		: level === 3
// 		// 		? { 'product.level3': ObjectId(category) }
// 		// 		: { 'product.level4': ObjectId(category) })
// 		// };
// 		// const populations = [
// 		// 	{
// 		// 		path: 'product',
// 		// 		select: 'name thumbImages'
// 		// 	},
//             // {
// 			// 	$match: {
// 			// 		...dbQuery2
// 			// 	}
// 			// },
// 		// ];

// 		// const products = await getResults(

// 		// 	Category,
// 		// 	dbQuery,
// 		// 	null,
// 		// 	'name',
// 		// 	'name',
// 		// 	populations
// 		// );

// 		// return products;
// 	} catch (error) {
// 		throw error;
// 	}
// };
// getDisabledSubProducts()

export const getOutOfStockProducts = async (queryObj, user) => {
	try {
		const dbQuery: any = {
			status: 'active',
			seller: user?._id,
			currentStock: { $lte: 0 }
		};

		const populations = [
			{
				path: 'product',
				select: 'name thumbImages'
			}
		];

		const products = await getResults(
			queryObj,
			NewProduct,
			dbQuery,
			null,
			'name',
			'name',
			1,
			15,
			populations
		);

		return products;
	} catch (error) {
		throw error;
	}
};

export const searchProducts = async (queryObj, user) => {
	try {
		if (!queryObj.search) {
			return;
		}

		let dbQuery = {
			// status: 'active',
			seller: ObjectId(user._id)
		};
		let results = await NewProduct.aggregate([
			{
				$match: {
					...dbQuery
				}
			},
			{
				$match: {
					name: {
						$regex: queryObj.search,
						$options: 'i'
					}
				}
			},
			{
				$facet: {
					data: [
						{
							$skip: getSkip(queryObj, queryObj.limit)
						},
						{
							$limit: +queryObj.limit
						}
					],
					count: [
						{
							$count: 'total'
						}
					]
				}
			}
		]);

		return {
			data: results[0].data,
			total: results[0].count?.[0]?.total || 0
		};
	} catch (error) {
		throw error;
	}
};

export const updatePrice = async (priceId: string, data: any, user) => {
	try {
		const dbQuery: any = {
			_id: priceId
		};

		const dbUpdate: any = {
			$set: {
				...data
			}
		};

		const updatedPrice = await NewProduct.findOneAndUpdate(dbQuery, dbUpdate, {
			new: true
		});

		return updatedPrice;
	} catch (error) {
		throw error;
	}
};

export const updateShopStatus = async (status: 'open' | 'closed', user, data) => {
	try {
		if (!status || !['open', 'closed'].includes(status)) {
			throwError(400);
		}
		let seller = await Seller.findById({ _id: user._id });

		if (!seller) {
			throwError(404);
		}

		let days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

		seller.shopStatus = status;
		// Get next day name to easily fetch slots
		let tomorrow = days[(new Date().getDay() + 1) % 7];
		// Sort tomorrow's slots to find opening slot
		let tomorrowSlotsSorted = [...seller.shopTiming[tomorrow]].sort((a, b) =>
			a.startTime < b.startTime ? -1 : 1
		);
		if (status === 'closed') {
			// Scheduler inactive time is the time till which shop timings will be ignored
			let schedulerInactiveTime = data.schedulerInactiveTime;
			if (data.type == 'tomorrow') {
				// REFACTOR: Estimating opening time to be after 4:00 AM
				// as some shops might operate after 12 AM and hence their first
				// slot of that day will be the one after 12 AM in which case
				// the opening slot will be different from the first slot
				let approxShopOpeningSlot = tomorrowSlotsSorted.find(
					(item) => item.startTime > '04:00'
				);
				schedulerInactiveTime = set(addDays(new Date(), 1), {
					hours: approxShopOpeningSlot?.startTime.split(':')[0] || '08',
					minutes: approxShopOpeningSlot?.startTime.split(':')[1] || '00'
				});
			}
			if (data.type == 'manual') {
				// If manual option is selected, then scheduler inactive time is set to 20 years from now
				let date = new Date();
				date.setFullYear(date.getFullYear() + 20);
				schedulerInactiveTime = date;
			}
			seller.schedulerInactiveTime = schedulerInactiveTime;
		} else {
			// When shop is being opened if current time is already in a slot, then scheduler inactive time is set to null
			seller.schedulerInactiveTime = null;
			let todayDate = new Date();
			let today = days[todayDate.getDay()];
			let todaySlotsSorted = [...seller.shopTiming[today]].sort((a, b) =>
				a.startTime < b.startTime ? -1 : 1
			);
			let timeString = todayDate.toTimeString().slice(0, 5);
			let currentSlot = todaySlotsSorted.find(
				(slot) => slot.startTime < timeString && slot.endTime > timeString
			);
			// If current time is not in any slot, then scheduler inactive time is set to the opening time of the next slot
			if (!currentSlot) {
				let nextSlot = todaySlotsSorted.find((slot) => slot.startTime >= timeString);
				// If there is no next slot, then scheduler inactive time is set to the opening time of the first slot of the next day
				if (nextSlot) {
					seller.schedulerInactiveTime = new Date(
						todayDate.setHours(
							nextSlot.startTime.split(':')[0],
							nextSlot.startTime.split(':')[1]
						)
					);
				} else {
					seller.schedulerInactiveTime = set(addDays(todayDate, 1), {
						hours: tomorrowSlotsSorted[0]?.startTime.split(':')[0] || '08',
						minutes: tomorrowSlotsSorted[0]?.startTime.split(':')[1] || '00'
					});
				}
			}
		}
		await seller.save();
		return seller;
	} catch (error) {
		throw error;
	}
};

export const deleteAccount = async (user) => {
	try {
		const dbQuery: any = {
			_id: user._id
		};

		// Remove items sold by this seller from buyer's carts
		await Cart.deleteMany({ seller: user._id });

		// Delete all products created by this seller
		await NewProduct.deleteMany({ seller: user._id });

		// Delete notifications
		await Notification.deleteMany({ user: user._id, userType: 'seller' });

		// Delete seller
		const deletedUser = await Seller.findOneAndDelete(dbQuery);

		return deletedUser;
	} catch (error) {
		throw error;
	}
};

export const confirmRider = async (data) => {
	const rider = await Rider.findOne({
		_id: data.riderId
	});

	rider.sellerApproved = true;
	await rider.save();

	return rider;
};

export const getRider = async (user) => {
	try {
		const rider = await Rider.findOne({
			_id: user.riderId
		});
		return rider;
	} catch (error) {
		throw error;
	}
};

// slot timings
export const getShopTiming = async (user) => {
	try {
		let seller = await Seller.findById({ _id: user._id });
		return seller.shopTiming;
	} catch (e) {}
};

export const updateShopTiming = async (data: any, user) => {
	try {
		let seller = await Seller.findById({ _id: user._id });
		seller.shopTiming = data;
		seller.save();
	} catch (e) {}
};

// Write a function that removes all spaces and special characters from a phone number
// and also removes the country code
// and returns the number in the format 234XXXXXXX

const formatNumber = (number) => {
	// remove spaces and special characters
	number = number.replace(/[^0-9]/g, '');

	// remove leading zeros
	number = number.replace(/^0+/, '');

	// remove country code by getting the last 10 digits of the number
	number = number.substring(number.length - 10);

	return number;
};

// Write a function that takes in an array of contacts and uploads them to the database
// The input array has the following format
/* {
	company: '',
	department: '',
	displayName: 'John Doe',
	emailAddresses: [],
	familyName: 'Doe',
	givenName: 'John',
	hasThumbnail: false,
	imAddresses: [],
	isStarred: false,
	jobTitle: '',
	middleName: '',
	note: '',
	phoneNumbers: [{ id: '3326', label: 'mobile', number: '+919876543210' }],
	postalAddresses: [],
	prefix: null,
	rawContactId: '123',
	recordID: '1234',
	suffix: null,
	thumbnailPath: '',
	urlAddresses: []
}; */
// The function should format the phone numbers of the contacts before uploading them
// It should also check if the contact already exists in the database
// If the contact already exists, it should update the contact with the new data and also update the sellerIds array
// If the contact does not exist, it should create a new contact
export const uploadContacts = async (contacts, user) => {
	try {
		const formattedContacts = contacts.map((contact) => {
			const formattedContact = {
				...contact,
				phoneNumbers: contact.phoneNumbers.map((phoneNumber) => {
					return {
						...phoneNumber,
						number: formatNumber(phoneNumber.number)
					};
				})
			};

			return formattedContact;
		});

		let contactsToUpload = [];

		for (let i = 0; i < formattedContacts.length; i++) {
			const contact = formattedContacts[i];

			const dbQuery = {
				phoneNumbers: {
					$elemMatch: {
						number: {
							$in: contact.phoneNumbers.map((phoneNumber) => phoneNumber.number)
						}
					}
				}
			};

			const existingContact = await Contact.findOne(dbQuery);

			// Create a variable to store the array of promises of update queries to be executed
			// So that we can execute all the promises at once using Promise.all
			// This is to avoid the overhead of making multiple queries to the database
			let updateQueries = [];

			if (existingContact) {
				const sellerIds = existingContact.sellers;

				if (!sellerIds.includes(user._id)) {
					sellerIds.push(user._id);
				}

				const dbUpdate = {
					$set: {
						...contact,
						sellers: sellerIds
					}
				};

				updateQueries.push(Contact.findOne(dbQuery).updateOne(dbUpdate));
			} else {
				contactsToUpload.push({
					...contact,
					sellers: [user._id]
				});
			}

			if (i === formattedContacts.length - 1) {
				contactsToUpload = contactsToUpload.filter(
					(contact) => contact.phoneNumbers.length > 0
				);
				await Promise.all(updateQueries);
				await Contact.insertMany(contactsToUpload);
			}
		}

		return {
			message: 'Contacts uploaded successfully'
		};
	} catch (error) {
		throw error;
	}
};

export const updateDisableStatus = async (id: string, date: Date, time: Date, user) => {
	try {
		let product = await NewProduct.findOne({
			_id: id,
			seller: user._id
		});
		product.temporaryDisabled = true;
		product.disableDuration.tillDate = date;
		product.disableDuration.tillTime = time;
		await product.save();
	} catch (error) {
		throw error;
	}
};

export const bulkUpload = async (req, res) => {
	try {
		let { sellerId } = req.body;
		if (!req.file) {
			return throwError(400, 'Please select a file to upload');
		}
		let alreadyFindedCategories: Record<string, any> = {};

		let sellerCategoryTree = await SellerCategory.find({ seller: sellerId }).lean();

		const parts = req.file.originalname.split('.');
		const fileType = parts[parts.length - 1];
		if (!['xlsx', 'csv'].includes(fileType)) {
			return throwError(401, 'Please select an XLSX file');
		}
		const workbook = XLSX.readFile(req.file.path);
		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];
		const data: [][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
		//  this  function return allproducts counts from category and its use only tesing purpose
		// allProductCount(sellerId);
		//  data modified according  to the  data model
		let productsArray = [];
		let productIdIndex = data[0]?.findIndex((row) => row === 'Id');
		let proudctNameIndex = data[0]?.findIndex((row) => row == 'Product Name');
		let productDiscriptionIndex = data[0]?.findIndex((row) => row == 'Description');
		let productGstTypeIndex = data[0]?.findIndex((row) => row == 'Gst Type');
		let productCategoryIndex = data[0].findIndex((row) => row == 'Category');
		let level2CategoryIndex = data[0].findIndex((row) => row == 'Level 2 SubCategory');
		let level3CategoryIndex = data[0].findIndex((row) => row == 'Level 3 SubCategory');
		let level4CategoryIndex = data[0].findIndex((row) => row == 'Level 4 SubCategory');
		let productGstIndex = data[0].findIndex((row) => row === 'Gst');
		let productPriceIndex = data[0].findIndex((row) => row == 'Price');
		let productSellingPriceIndex = data[0].findIndex((row) => row == 'Selling Price');
		let proudctVegIndex = data[0].findIndex((row) => row == 'Veg');
		let productImageIndex = data[0].findIndex((row) => row === 'Image');
		let longDescriptionIndex = data[0].findIndex((row) => row === 'Long Description');
		let barcodeIndex = data[0].findIndex((row) => row === 'Barcode');
		data.shift();

		if (level2CategoryIndex < 0) {
			return {
				message:
					'File Not Uploaded Due To Level 2 SubCategory not found. If Level 2 SubCategory Exists Please Check the spelling',
				fileType,
				UploadedProducts: 0,
				updatedProductsCount: 0,
				newlyAddedProducts: 0
			};
		} else if (productGstTypeIndex < 0) {
			return {
				message:
					'File Not Uploaded Due to GST Type not found. If GST Type Exists Please Check the spelling',
				fileType,
				UploadedProducts: 0,
				updatedProductsCount: 0,
				newlyAddedProducts: 0
			};
		} else if (productPriceIndex < 0) {
			return {
				message:
					'File Not Uploaded Due to Price not found. If Price Exists Please Check the spelling',
				fileType,
				UploadedProducts: 0,
				updatedProductsCount: 0,
				newlyAddedProducts: 0
			};
		} else if (productSellingPriceIndex < 0) {
			return {
				message:
					'File Not Uploaded Due to Selling Price not found. If Selling Price Exists Please Check the spelling',
				fileType,
				UploadedProducts: 0,
				updatedProductsCount: 0,
				newlyAddedProducts: 0
			};
		} else if (proudctNameIndex < 0) {
			return {
				message:
					'File Not Uploaded Due to Product Name not found. If Product Name Exists Please Check the spelling',
				fileType,
				UploadedProducts: 0,
				updatedProductsCount: 0,
				newlyAddedProducts: 0
			};
		} else if (productGstIndex < 0) {
			return {
				message:
					'File Not Uploaded Due to GST not found. If GST Exists Please Check the spelling',
				fileType,
				UploadedProducts: 0,
				updatedProductsCount: 0,
				newlyAddedProducts: 0
			};
		}

		let notUploaded = [];
		const bulkOperations = [];
		const updatedProducts = [];
		for (let i = 0; i < data.length; i++) {
			let product: any = data[i];
			let index = i;

			try {
				let productId = product[productIdIndex];
				let productName = product[proudctNameIndex];
				notUploaded.push({ name: productName, no: index });
				let level1Name = product[productCategoryIndex]?.trim();

				let level1: any = {};
				let maincategory;

				if (!alreadyFindedCategories[level1Name]) {
					maincategory = sellerCategoryTree.find((cat) => cat.name == level1Name);
					if (maincategory) {
						level1 = {
							l1: maincategory.globalCatID,
							_id: maincategory._id,
							canProductAdded: false
						};
						alreadyFindedCategories[level1Name] = {
							l1: maincategory.globalCatID,
							_id: maincategory._id,
							canProductAdded: false
						};
					} else {
						return {
							status: 404,
							message:
								'File Not Uploaded Due to Parent Category not found. If Parent Category Exists Please Check the spelling',
							fileType,
							UploadedProducts: 0,
							updatedProductsCount: 0,
							newlyAddedProducts: 0
						};
					}
				} else {
					level1 = alreadyFindedCategories[level1Name];
				}

				let level2Name = product[level2CategoryIndex]?.trim();
				let level2;
				try {
					if (!alreadyFindedCategories[product?.level2Name]) {
						level2 = await sellerHasCategory(
							sellerCategoryTree,
							sellerId,
							level2Name,
							2,
							level1._id
						);

						alreadyFindedCategories[level2Name] = level2;
					} else {
						level2 = alreadyFindedCategories[level2Name];
					}
				} catch (e) {
					console.error(e, 'l2');
				}
				let level3;
				let level3Name = product[level3CategoryIndex]?.trim();
				if (product[level3CategoryIndex]) {
					try {
						level3 = alreadyFindedCategories[level3Name]
							? alreadyFindedCategories[level3Name]
							: await sellerHasCategory(
									sellerCategoryTree,
									sellerId,
									level3Name,
									3,
									level1._id,
									level2._id
							  );
						alreadyFindedCategories[level3Name] = level3;
					} catch (error) {
						console.error('L3', error);
					}
				}
				let level4;
				let level4Name = product[level4CategoryIndex]?.trim();
				if (product[level4CategoryIndex]) {
					try {
						level4 = alreadyFindedCategories[level4Name]?.trim()
							? alreadyFindedCategories[level4Name]
							: await sellerHasCategory(
									sellerCategoryTree,
									sellerId,
									level4Name,
									4,
									level1._id,
									level2._id,
									level3._id
							  );
					} catch (error) {
						console.error(error);
					}
					alreadyFindedCategories[level4Name] = level4;
				}
				if (!level3 && !level4 && !level2?.canProductAdd) {
					throwError(405, 'level 2 have subCategory,You are not allowed to add');
				}
				if (!level4 && level3) {
					if (!level3.canProductAdd) {
						console.error('level 3 have subCategory,You are not allowed to add');

						throwError(409);
					}
				}

				let image = product[productImageIndex];
				let description = product[productDiscriptionIndex] || '';
				let gstType = product[productGstTypeIndex];
				let gst = product[productGstIndex];
				let sellingPrice = product[productSellingPriceIndex] || product[productPriceIndex];
				let price = product[productPriceIndex];
				let longDescription = product[longDescriptionIndex];
				let barcode = product[barcodeIndex];
				let mainPrice =
					gstType == 'none'
						? price
						: gstType == 'inc'
						? (price * 100) / (100 + gst)
						: price;
				price = gstType == 'exc' ? price + price * 0.01 * gst : price;
				let gstValue =
					gstType == 'none'
						? 0
						: gstType == 'inc'
						? price - mainPrice
						: price - mainPrice;
				let veg = product[proudctVegIndex] ? product[proudctVegIndex] == 'Veg' : true;
				let minPrice = {
					price,
					gst,
					sellingPrice,
					gstType,
					gstValue,
					mainPrice
				};
				let thumbImages = [];
				if (image) {
					thumbImages = [
						{
							image: image,
							thumb: image
						}
					];
				}

				//Now Check if Id is there in the product or not
				if (productId) {
					let existingProduct = await NewProduct.findOne({
						_id: ObjectId(productId)
					}).lean();

					let newProduct = {
						name: productName,
						level1: level1._id,
						level2: level2._id,
						...(level3 ? { level3: level3._id } : {}),
						...(level4 ? { level4: level4._id } : {}),
						seller: sellerId,
						description,
						minPrice,
						veg,
						thumbImages,
						...(longDescription ? { longDescription } : {}),
						...(barcode ? { barcode } : {})
					};

					const previousProduct = {
						name: existingProduct.name,
						description: existingProduct.description,
						sellingPrice: existingProduct.minPrice.sellingPrice,
						veg: existingProduct.veg,
						seller: existingProduct.seller
					};

					const newProductHash = createHmac(
						'sha256',
						JSON.stringify({
							name: productName,
							description,
							sellingPrice: minPrice.sellingPrice,
							veg,
							seller: sellerId
						})
					).digest('hex');
					const existingProductHash = createHmac(
						'sha256',
						JSON.stringify(previousProduct)
					).digest('hex');

					if (newProductHash !== existingProductHash) {
						updatedProducts.push(newProductHash);
					}

					//bulkUpdate
					bulkOperations.push({
						updateOne: {
							filter: { _id: ObjectId(productId) },
							update: { $set: newProduct }
						}
					});
				} else {
					//for new product
					let newProduct = {
						name: productName,
						level1: level1._id,
						level2: level2._id,
						...(level3 ? { level3: level3._id } : {}),
						...(level4 ? { level4: level4._id } : {}),
						seller: sellerId,
						description,
						minPrice,
						veg,
						thumbImages,
						...(longDescription ? { longDescription } : {}),
						...(barcode ? { barcode } : {})
					};

					let oldProductArrayLength = productsArray.length;
					if (!productName) {
						throwError(401, 'Product name is required');
					}
					productsArray.push(newProduct);
					if (productsArray.length > oldProductArrayLength) {
						let productNew: IProduct = productsArray[productsArray.length - 1];

						if (!productNew.level4 && !productNew.level3) {
							increaseProductCountInCategory(
								productNew.level2,
								2,
								productNew.seller,
								1
							);
						} else if (!productNew.level4) {
							increaseProductCountInCategory(
								productNew.level3,
								3,
								productNew.seller,
								1
							);
						} else {
							increaseProductCountInCategory(
								productNew.level4,
								4,
								productNew.seller,
								1
							);
						}
					}
					notUploaded.pop();
				}
			} catch (err) {
				console.error(err);
			}
		}

		let insertProuducts: any;
		try {
			insertProuducts = await NewProduct.insertMany(productsArray, {
				ordered: true
			});
		} catch (err) {
			console.error(err);
		}

		let bulkWriteResult;
		try {
			bulkWriteResult = await NewProduct.bulkWrite(bulkOperations);
		} catch (err) {
			console.error(err);
		}

		// allProductCount(sellerId);

		return {
			message: 'File uploaded successfully',
			fileType,
			UploadedProducts: insertProuducts?.length,
			products: insertProuducts,
			notUploaded: notUploaded.length,
			notUploadedInfo: notUploaded,
			updatedProductsCount: updatedProducts.length,
			newlyAddedProducts: productsArray.length
		};
	} catch (error) {
		throw error;
	}
};

export const getAllSellers = async (user) => {
	try {
		let users = await Rider.findById(user._id);
		if (!users) {
			throw new Error('Rider unknown');
		}
		const customers = await Seller.find({}, { name: 1, _id: 1 });
		return customers;
	} catch (error) {}
};

export const increaseProductCountInCategory = async (
	categoryId,
	level,
	sellerId,
	count?: Number
) => {
	try {
		let levelUpdate = await SellerCategory.updateOne(
			{ _id: categoryId },
			{ $inc: { productCount: count || 1 } }
		);

		return;
	} catch (error) {
		throwError(error);
	}
};
export const decreaseProductCountInCategory = async (
	categoryId,
	level,
	sellerId,
	count?: Number
) => {
	try {
		let levelUpdate = await SellerCategory.updateOne(
			{ _id: categoryId },
			{ $inc: { productCount: -count || -1 } }
		);
		return;
	} catch (error) {
		throwError(error);
	}
};

export const allLevel1Categories = async () => {
	try {
		let results = await Category.aggregate([
			{
				$match: {
					status: 'active',
					level: 1
				}
			},
			{
				$sort: { position: 1 }
			},
			{
				$project: {
					_id: 1,
					name: 1,
					position: 1,
					level: 1,
					commission: 1,
					thumb: 1,
					isRestaurantService: 1,
					insurance: 1
				}
			}
		]);

		return results;
	} catch (error) {
		throw error;
	}
};

export const sellerHasCategory = async (
	sellerCategories,
	sellerId,
	category: string,
	level: number,
	level1Id: string,
	level2Id?: string,
	level3Id?: string
) => {
	try {
		let categoryObj: any = {};
		let categoryId = '';
		let newCreated = false;
		let canProductAdd = true;
		let newCate: any = {};
		categoryObj = sellerCategories.find((c) => c.name == category);
		if (!categoryObj?._id) {
			newCate = {
				seller: sellerId,
				name: category,
				status: 'active',
				level,
				level1: level1Id,
				...(level3Id ? { level3: level3Id } : {}),
				...(level2Id ? { level2: level2Id } : {})
			};

			let updateSellerWithNewCategory = new SellerCategory(newCate);
			categoryObj = await updateSellerWithNewCategory.save();

			sellerCategories.push(updateSellerWithNewCategory);
		}
		// if not found category in category tree

		if (categoryObj.productCount == 0) {
			if (level == 2) {
				let checkHasSubCategory = await SellerCategory.findOne({
					level2: categoryObj._id
				});
				if (checkHasSubCategory) {
					canProductAdd = false;
				}
			} else if ((level = 3)) {
				let checkHasSubCategory = await SellerCategory.findOne({
					level3: categoryObj._id
				});
				if (checkHasSubCategory) {
					canProductAdd = false;
				}
			}
		}
		if (categoryObj == undefined) {
		}
		categoryObj.canProductAdd = canProductAdd;

		return categoryObj;
	} catch (e) {
		console.error('ERROR', e);
	}
};
//   this function only for  debugging
export const allProductCount = async (sellerId) => {
	let sai = await SellerCategory.aggregate([
		{
			$match: { seller: ObjectId(sellerId) }
		},
		{
			$group: {
				_id: '$seller',
				totalProductCount: { $sum: '$productCount' }
			}
		}
	]);

	return;
};
async function updatePackingTime() {
	try {
		const updateAvgPackingTime = await Order.aggregate([
			{
				$match: {
					'currentStatus.status': 'delivered',
					'statusHistory.status': { $in: ['placed', 'ready'] },
					'currentStatus.date': {
						$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
					}
				}
			},
			{ $unwind: '$statusHistory' },
			{
				$match: {
					'statusHistory.status': { $in: ['placed', 'ready'] }
				}
			},
			{
				$group: {
					_id: { seller: '$seller', order: '$_id' },
					minDate: { $min: '$statusHistory.date' },
					maxDate: { $max: '$statusHistory.date' },
					sellerName: { $first: '$sellerDetails.name' }
				}
			},
			{
				$addFields: {
					deliveryTime: {
						$dateDiff: {
							startDate: '$minDate',
							endDate: '$maxDate',
							unit: 'minute'
						}
					}
				}
			},
			{
				$group: {
					_id: '$_id.seller',
					sellerName: { $first: '$sellerName' },
					averagePackingTime: { $avg: '$deliveryTime' },
					totalOrders: { $sum: 1 },
					deliveryTimes: { $push: '$deliveryTime' }
				}
			}
		]);

		// Iterate over the sellers array
		for (let seller of updateAvgPackingTime) {
			// Update the packingTime field for each seller
			if (seller.totalOrders > 1) {
				await Seller.updateOne(
					{ _id: seller._id }, // filter
					{ $set: { packingTime: Math.ceil(seller.averagePackingTime) } } // update
				);
			}
		}
	} catch (err) {
		console.log(err.stack);
	}
}

new CronJob(
	'0 9 * * *', //update at every 9am
	function () {
		updatePackingTime();
	},
	null,
	true
);
