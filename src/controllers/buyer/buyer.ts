import { model, Types } from 'mongoose';
import * as dateFns from 'date-fns';

import { getLimit, getPage, getResults, getSearch, getSkip, getSort } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { QueryObj } from '../../middlewares/query';
import { ICategory } from '../../models/category/category';
import { ILocation } from '../../models/seller/location';
import { ICustomer } from '../../models/customer/customer';
import { IWishlist } from '../../models/customer/wishlist';
import { IGroupOrder } from '../../models/order/group-order';
import { IOrder } from '../../models/order/order';
import { IPrice } from '../../models/seller/price';
import { IProduct } from '../../models/seller/product';
import { ICart } from '../../models/customer/cart';
import { INotification } from '../../models/notification/notification';
import { getSellerFilterQuery } from './buyer-query';
import { IVersion } from '../../models/general/version';
import { ISeller } from '../../models/customer/seller';
import { ICoupon } from '../../models/customer/coupons';

import { getAvailableCategory } from './product';
import { tf0 } from '../../helpers/number';
import { IHistory } from '../../models/general/history';

const ObjectId = Types.ObjectId;
const Location = model<ILocation>('Location');
const Customer = model<ICustomer>('Customer');
const Category = model<ICategory>('Category');
const Price = model<IPrice>('Price');
const NewProduct = model<IProduct>('NewProduct');

const Order = model<IOrder>('Order');
const GroupOrder = model<IGroupOrder>('GroupOrder');
const Wishlist = model<IWishlist>('Wishlist');
const Cart = model<ICart>('Cart');
const Notification = model<INotification>('Notification');
const Version = model<IVersion>('Version');
const Seller = model<ISeller>('NewCustomer');
const Coupon = model<ICoupon>('Coupon');
const History = model<IHistory>('History');

export const saveBuyerOnBoardingData = async (data, user) => {
	let customer = await Customer.findOne({ _id: user._id });
	if (!customer) {
		throwError(404);
	}
	customer.sourceOfDiscovery = data.sourceOfDiscovery;
	await customer.save();
	return {};
};

export const getParentCategory = async (user) => {
	try {
		let catIds = await Customer.findById(user?._id).select('categories');
		let level1Ids = catIds?.categories?.map((c) => c.l1);

		let category = await Category.find({ level: 1, status: 'active', _id: { $in: level1Ids } })
			.select('name thumb')
			.lean();

		return category;
	} catch (error) {
		throw error;
	}
};

export const sellerByMainCategory = async (queryObj, data) => {
	//     return result

	try {
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
			name: 1,
			businessName: 1,
			avatar: 1,
			shopPhotos: 1,
			// productCategory: 1,
			priceTable: 1,
			runningOrder: 1,
			shopStatus: 1,
			rating: 1,
			orderCount: 1,
			packingTime: 1,
			'deliveryMode.selfdelivery.freeDeliveryAmount': 1,
			[shopTimingProjection]: 1,
			orders: 1,
			averageDiscount: 1,
			position: 1,
			premium: 1,
			'deliveryMode.platform.freeDeliveryAmount': 1
		};
		// 'deliveryMode.selfdelivery.freeDeliveryAmount'its minimum order amount for free delivery

		//  buyer's latitude and longitude
		let { category, filter, latitude, longitude } = data;
		let { sort, order } = queryObj;

		let sellers = data.sellers.map((e) => ObjectId(e));
		if (filter?.createdAt) {
			filter = { ...filter, createdAt: { $gte: new Date(filter.createdAt['$gte']) } };
		}

		let sendFiltersToFrontend = [
			{
				display: 'Rating 4.0+',
				value: ['rating.overAll', { $gte: 4 }]
			},
			{
				display: 'New Arrivals',
				value: ['createdAt', { $gte: dateFns.subWeeks(new Date(), 2) }]
			}
		];

		const sentSortOptionsToFrontend = [
			{
				value: 'default',
				order: 'asc',
				display: 'Relevance'
			},
			{
				value: 'averageDiscount',
				order: 'asc',
				display: 'Cost: Low To High'
			},
			{
				value: 'averageDiscount',
				order: 'desc',
				display: 'Cost: High To Low'
			}
		];

		let results = await Seller.aggregate([
			{
				$geoNear: {
					near: { type: 'Point', coordinates: [longitude, latitude] },
					distanceField: 'distance'
				}
			},
			{
				$match: { parentCategory: ObjectId(category), _id: { $in: sellers }, ...filter }
			},
			{
				$project: {
					distance: { $floor: { $divide: ['$distance', 1000] } },
					averageDeliveryTime: {
						$floor: {
							$add: [{ $multiply: ['$distance', 0.003] }, '$packingTime']
						}
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
			},
			{
				$sort: {
					shopStatus: -1,
					position: 1,
					[sort]: order == 'asc' ? 1 : -1,
					'orders.total': -1, // Sort by rating in descending order
					distance: 1, // Sort by nearest distance first (ascending order)
					averageDiscount: -1, // Sort by averageDiscount in descending order
					rating: -1
				}
			}
		]);

		return {
			sellers: results,
			filters: sendFiltersToFrontend,
			sortOptions: sentSortOptionsToFrontend,
			premiumTags: ['Wide Range', 'Best Quality']
		};
	} catch (error) {
		throw error;
	}
};
export const getSubCategoryByLevel = async (level: string | number, parentId: string, user) => {
	try {
		if (isNaN(+level)) {
			throwError(400);
		}

		let catIds = await Seller.findById(user?._id).select('categories level4');

		level = +level;

		let query: any = {
			level: level,
			status: 'active'
		};

		if (level === 2) {
			let ids = [];
			catIds?.categories.forEach((c1) => c1.sub.forEach((c2) => ids.push(c2.l2)));
			query._id = { $in: ids || [] };
			query.level1 = parentId;
		} else if (level === 3) {
			let ids = [];
			catIds?.categories.forEach((c1) =>
				c1.sub.forEach((c2) => c2.sub.forEach((c3) => ids.push(c3.l3)))
			);
			query._id = { $in: ids || [] };
			query.level2 = parentId;
		} else if (level === 4) {
			query._id = { $in: catIds?.level4 || [] };
			query.level3 = parentId;
		}

		let categories = await Category.find(query)
			.sort({ position: 1 })
			.select('name thumb')
			.lean();

		return categories;
	} catch (error) {
		throw error;
	}
};

export const getWalletBalance = async (user, queryObj) => {
	let customer = await Customer.findById(user._id);
	return {
		balance: customer.balance,
		rewardBalance: customer.rewardBalance,
		walletDiscount: customer.walletDiscountPercent
	};
};

export const updateWalletBalance = async (user) => {
	let customer = await Customer.findById(user._id);
	return {
		rewardBalance: customer.rewardBalance,
		walletDiscount: customer.walletDiscountPercent
	};
};

export const applyWalletAndReward = async (data, user) => {
	try {
		const { reward, balance } = data;
		let buyer = await Customer.findOne({ _id: user._id });
		if (!buyer) {
			throwError(404);
		}
		if (balance) {
			buyer.balance -= balance;
			await History.create({
				type: 'wallet',
				buyer: buyer._id,
				amount: balance,
				date: new Date(),
				action: 'debit',
				remark: 'Apply wallet on order'
			});
		}
		if (reward) {
			buyer.rewardBalance -= reward;
			await History.create({
				type: 'reward',
				amount: reward,
				buyer: buyer._id,
				date: new Date(),
				action: 'debit',
				remark: 'Apply Reward on order'
			});
		}

		await buyer.save();
		return;
	} catch (error) {
		throwError(error);
	}

	// reward  and balance these value subtract form buyer reward and balance
};
export const removeWalletAndReward = async (data, user) => {
	try {
		const { reward, balance } = data;
		let buyer = await Customer.findOne({ _id: user._id });

		if (!buyer) {
			throwError(404);
		}
		if (balance) {
			buyer.balance += balance;
			await History.create({
				type: 'wallet',
				amount: balance,
				buyer: buyer._id,
				date: new Date(),
				action: 'credit'
			});
		}
		if (reward) {
			buyer.rewardBalance += reward;
			await History.create({
				type: 'reward',
				amount: reward,
				buyer: buyer._id,
				date: new Date(),
				action: 'credit'
			});
		}
		await buyer.save();
		return;
	} catch (error) {
		throwError(error);
	}

	// reward  and balance these value subtract form buyer reward and balance
};
export const search = async (queryObj, data, user) => {
	try {
		if (!queryObj.search) {
			return;
		}

		const sellerIds = data.sellers.map((seller) => ObjectId(seller));

		let categoryQuery: any = {
			status: 'active'
		};
		let sellerQuery: any = {
			_id: { $in: sellerIds },
			status: 'active',

			approved: true
		};

		let categories = await getResults(
			queryObj,
			Category,
			categoryQuery,
			{ name: 1, thumb: 1 },
			'name',
			'name',
			1,
			10,
			['level1', 'level2', 'level3']
		);
		let sellers: any = await getResults(
			queryObj,
			Seller,
			sellerQuery,
			{ name: 1, avatar: 1, level4: 1, businessName: 1, shopPhotos: 1 },
			'businessName',
			'name',
			1,
			10
		);

		return { categories: categories.data, sellers: sellers.data };
	} catch (error) {
		throw error;
	}
};
export const searchProductsBySeller = async (queryObj: any, data: any, user) => {
	let { sort, search, limit, page, filter, shop, order } = queryObj;
	let sellers = data?.sellers?.map((e) => ObjectId(e));

	if (!queryObj.search) {
		return;
	}

	let searchQuery = {
		// $text: { $search: search },
		status: 'active',
		seller: { $in: sellers }
	};

	let results = await NewProduct.aggregate([
		{
			$search: {
				index: 'newproducts',
				compound: {
					must: [
						{
							text: {
								query: search,
								path: 'name',
								score: {
									boost: {
										value: 5
									}
								},
								fuzzy: {
									maxEdits: 1,
									prefixLength: 2
								}
							}
						}
					],
					should: [
						{
							text: {
								query: search,
								path: 'description',
								fuzzy: {
									maxEdits: 1
								},
								score: {
									boost: {
										value: 2
									}
								}
							}
						}
					]
				}
			}
		},
		{
			$match: searchQuery
		},
		{ $sort: { searchScore: -1 } },

		{ $project: { specifications: 0 } },

		{
			$skip: getSkip(queryObj, +queryObj.limit)
		},
		{
			$limit: +queryObj.limit
		},
		{ $sort: { [sort]: order == 'asc' ? 1 : -1 } }
	]);
	let total = await NewProduct.countDocuments({
		$text: { $search: search },
		status: 'active',
		seller: { $in: sellers }
	});

	return {
		results,
		total
	};
};
export const searchProducts = async (queryObj: any, data: any, user) => {
	try {
		let { sort, search, limit, page, filter, shop, order } = queryObj;
		// below filters are only testing
		filter = JSON.parse(filter);

		if (!queryObj.search) {
			return;
		}

		const sellers = data.sellers.map((seller) => ObjectId(seller));
		let { latitude, longitude } = data;
		let finalProductList = [];
		let shops: any;
		let count: any;
		if (shop == 'false') {
			finalProductList = await NewProduct.aggregate([
				{
					$search: {
						index: 'newproducts',
						compound: {
							must: [
								{
									text: {
										query: search,
										path: 'name',
										score: {
											boost: {
												value: 5
											}
										},
										fuzzy: {
											maxEdits: 1,
											prefixLength: 2
										}
									}
								}
							],

							should: [
								{
									text: {
										query: search,
										path: 'description',
										fuzzy: {
											maxEdits: 1,
											prefixLength: 2
										},
										score: {
											boost: {
												value: 2
											}
										}
										// analyzer: 'lucene.standard'
									}
								}
							]
							//minimumShouldMatch: 1
						}
					}
				},

				{
					$match: {
						seller: { $in: sellers },
						status: 'active',
						...filter.product
					}
				},
				{
					$project: {
						name: 1,
						description: 1,
						seller: 1,
						minPrice: 1,
						thumbImages: 1,
						level1: 1,
						level2: 1,
						level3: 1,
						score: { $meta: 'searchScore' }
					}
				},
				{
					$group: {
						_id: '$seller',
						products: { $push: '$$ROOT' },
						maxScore: { $max: '$score' }
					}
				},
				{
					$project: {
						products: { $slice: ['$products', 20] },
						maxScore: 1
					}
				},
				{ $sort: { score: -1, [sort]: order == 'asc' ? 1 : -1 } },
				{
					$lookup: {
						from: 'newcustomers',
						let: { seller: '$_id' },
						pipeline: [
							{
								$geoNear: {
									near: { type: 'Point', coordinates: [longitude, latitude] },
									distanceField: 'distance'
								}
							},
							{ $match: { $expr: { $eq: ['$_id', '$$seller'] } } },
							{
								$project: {
									distance: { $floor: { $divide: ['$distance', 1000] } },
									averageDeliveryTime: {
										$floor: {
											$add: [
												{ $multiply: ['$distance', 0.003] },
												'$packingTime'
											]
										}
									},
									shopPhotos: 1,
									rating: 1,
									parentCategory: 1,
									businessName: 1,
									avatar: 1
								}
							}
						],
						as: 'seller'
					}
				},
				{
					$unwind: {
						path: '$seller'
					}
				},
				{
					$replaceRoot: {
						newRoot: {
							$mergeObjects: [
								'$seller',
								{ maxScore: '$maxScore', products: '$products' }
							]
						}
					}
				},
				{
					$match: {
						...filter.seller
					}
				},
				{ $sort: { maxScore: -1 } },
				{
					$skip: getSkip(queryObj, +queryObj.limit)
				},
				{
					$limit: +queryObj.limit
				}
			]);
		} else {
			let shopsWithOutCoupons = await Seller.aggregate([
				{
					$geoNear: {
						near: { type: 'Point', coordinates: [longitude, latitude] },
						distanceField: 'distance'
					}
				},
				{
					$match: {
						_id: { $in: sellers },
						businessName: {
							$regex: search,
							$options: 'i'
						},
						status: 'active'
					}
				},

				{ $sort: { shopStatus: -1 } },
				{
					$project: {
						distance: { $floor: { $divide: ['$distance', 1000] } },
						averageDeliveryTime: {
							$floor: { $add: [{ $multiply: ['$distance', 0.003] }, '$packingTime'] }
						},
						shopPhotos: 1,
						rating: 1,
						parentCategory: 1,
						businessName: 1,
						avatar: 1,
						shopStatus: 1
					}
				},
				{
					$match: {
						...filter.seller
					}
				},
				{
					$lookup: {
						from: 'coupons',
						localField: '_id',
						foreignField: 'seller',
						as: 'coupons'
					}
				}
			]);

			shops = await Category.populate(shopsWithOutCoupons, {
				path: 'parentCategory',
				select: { name: 1 }
			});
		}

		return {
			data: finalProductList,
			shope: shops,
			total: count,
			page: queryObj.page
		};
	} catch (error) {
		throw error;
	}
};

export const searchRunningOrders = async (queryObj: QueryObj, data: any, user) => {
	try {
		let sort = getSort(queryObj, 'createdAt', -1);
		let skip = getSkip(queryObj, 15);
		let page = getPage(queryObj);
		let limit = getLimit(queryObj, 15);
		let search = getSearch(queryObj);

		let buyersCategory = await Seller.findById(user._id).select('level4');

		const productIds = await NewProduct.distinct('_id', {
			status: 'active',
			seller: user._id,
			...(search
				? {
						name: {
							$regex: search,
							$options: 'i'
						}
				  }
				: {}),
			...(data?.categories?.length
				? { level3: { $in: data.categories } }
				: { level4: { $in: buyersCategory.level4 } })
		});

		const groupOrderIds = await Order.distinct('groupOrder', {
			seller: { $ne: user._id },
			isGroupOrder: true,
			'matured.status': false,
			'accepted.status': true,
			'items.product': { $in: productIds }
		});

		const total = await GroupOrder.find({
			_id: { $in: groupOrderIds }
		}).countDocuments();

		const results = await GroupOrder.find({
			_id: { $in: groupOrderIds }
		})
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.populate('seller', 'businessName priceTable')
			.populate({
				path: 'orders',
				select: 'items.product',
				populate: {
					path: 'items.product',
					select: 'name thumbImages minPrice type'
				}
			})
			.lean();

		for (let result of results) {
			const products = {};
			for (let order of (result as any).orders as IOrder[]) {
				for (let item of order.items) {
					if (!products[(item.product as IProduct)._id.toString()]) {
						products[(item.product as IProduct)._id.toString()] = item.product;
					}
				}
			}
			delete (result as any).orders;
			(result as any).products = Object.values(products);

			for (let product of (result as any).products) {
				product.wishlist = await Wishlist.findOne({
					status: 'active',
					buyer: user._id,
					product: product._id
				});
			}

			(result as any).runningWishlist = await Wishlist.findOne({
				status: 'active',
				buyer: user._id,
				groupOrder: result._id
			});
		}

		return {
			data: results,
			total: total,
			page: page,
			limit: limit,
			search: search,
			sort: Object.keys(sort)[0] || '',
			order:
				sort[Object.keys(sort)[0]] === 'asc' || sort[Object.keys(sort)[0]] === 1
					? 'asc'
					: 'desc'
		};
	} catch (error) {
		throw error;
	}
};

export const filterRunning = async (queryObj: QueryObj, data: any, user) => {
	try {
		let sort = getSort(queryObj, 'createdAt', -1);
		let skip = getSkip(queryObj, 15);
		let page = getPage(queryObj);
		let limit = getLimit(queryObj, 15);

		const productIds = await NewProduct.distinct('_id', {
			seller: { $ne: user._id },
			level4: { $in: data.categories },
			status: 'active'
		});

		const groupOrderIds = await Order.distinct('groupOrder', {
			seller: { $ne: user._id },
			isGroupOrder: true,
			'matured.status': false,
			'accepted.status': true,
			'cancelled.status': false,
			'items.product': { $in: productIds }
		});

		const total = await GroupOrder.find({
			_id: { $in: groupOrderIds }
		}).countDocuments();

		const results = await GroupOrder.find({
			_id: { $in: groupOrderIds }
		})
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.populate('seller', 'businessName priceTable')
			.populate({
				path: 'orders',
				select: 'items.product',
				populate: {
					path: 'items.product',
					select: 'name thumbImages minPrice type'
				}
			})
			.lean();

		for (let result of results) {
			const products = {};
			for (let order of (result as any).orders as IOrder[]) {
				for (let item of order.items) {
					if (!products[(item.product as IProduct)._id.toString()]) {
						products[(item.product as IProduct)._id.toString()] = item.product;
					}
				}
			}
			delete (result as any).orders;
			(result as any).products = Object.values(products);
			for (let product of (result as any).products) {
				product.wishlist = await Wishlist.findOne({
					status: 'active',
					buyer: user._id,
					product: product._id
				});
			}

			(result as any).runningWishlist = await Wishlist.findOne({
				status: 'active',
				buyer: user._id,
				groupOrder: result._id
			});
		}

		return {
			data: results,
			total: total,
			page: page,
			limit: limit,
			search: search,
			sort: Object.keys(sort)[0] || '',
			order:
				sort[Object.keys(sort)[0]] === 'asc' || sort[Object.keys(sort)[0]] === 1
					? 'asc'
					: 'desc'
		};
	} catch (error) {
		throw error;
	}
};

export const filterNonRunning = async (queryObj: QueryObj, data: any, user) => {
	try {
		let dbQuery: any = {
			status: 'active',
			seller: { $ne: user._id },
			level4: { $in: data.categories }
		};
		let results = await getResults(queryObj, NewProduct, dbQuery, {}, 'name', 'name', 1, 10);
		// for (let result of results.data) {
		// 	result.wishlist = await Wishlist.findOne({
		// 		status: 'active',
		// 		buyer: user._id,
		// 		product: result._id
		// 	});
		// }
		return results;
	} catch (error) {
		throw error;
	}
};

export const filterSeller = async (queryObj: QueryObj, data: any, user) => {
	try {
		let skip = getSkip(queryObj, 15);
		let page = getPage(queryObj);
		let limit = getLimit(queryObj, 15);
		let result = null;
		let total;

		const categories =
			typeof data?.categories === 'string'
				? [ObjectId(data.categories)]
				: data.categories.map((id) => ObjectId(id));

		// let buyersCategory = await Customer.findById(user._id).select('level4');

		result = await Seller.aggregate(
			getSellerFilterQuery(categories, ObjectId(user._id), skip, limit)
		);

		let results = [];
		if (result.length) {
			result = result[0];
			if (result.metadata && result.metadata.length && result.metadata[0].total) {
				total = result.metadata[0].total;
			} else {
				total = 0;
			}
			if (result.results) {
				results = result.results;
			}
		}

		for (let result of results) {
			result.sellerWishlist = await Wishlist.findOne({
				status: 'active',
				buyer: user._id,
				seller: result._id
			});
		}

		return {
			data: results,
			total: total,
			limit: limit,
			page: page
		};
	} catch (error) {
		throw error;
	}
};

export const getLocations = async (user) => {
	try {
		const locations = await Location.find({ status: 'active' }).lean();
		return locations;
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
		// await Cart.deleteMany({ buyer: user._id });

		// Delete notifications
		// await Notification.deleteMany({ user: user._id, userType: 'buyer' });

		// Delete seller
		// const deletedUser = await Customer.findOneAndDelete(dbQuery);

		return;
	} catch (error) {
		throw error;
	}
};

export const getAppMetadata = async (appName: string, versionName: string) => {
	try {
		if (!appName || !versionName) {
			throwError(400);
		}
		appName = appName.trim();
		versionName = versionName.trim();
		let version = await Version.findOne({
			status: 'active',
			appName: appName,
			version: versionName
		});
		if (!version) {
			throwError(404);
		}
		return version.metadata ?? {};
	} catch (error) {
		throw error;
	}
};

export const sendHomePageData = async (data, user) => {
	const [availableCategory, nearbyShops, orderAgain, mostSelling, sellerWithProducts] =
		await Promise.all([
			getAvailableCategory({}, data),
			nearByShops(data.sellers, data.longitude, data.latitude),
			recentOrder(data.buyer, data.sellers),
			mostSellingShops(data.sellers),
			highDiscountProducts(data.sellers)
		]);
	const { deviceInfo } = data;

	if (deviceInfo) {
		let buyer = await Customer.findOne({ _id: user._id }).select('deviceInfo');
		if (buyer.deviceInfo) {
			buyer.deviceInfo = buyer?.deviceInfo?.filter(
				(info) =>
					info?.version != deviceInfo?.version?.toString() ||
					info?.platform != deviceInfo?.platform?.toString()
			);

			buyer.deviceInfo.push(deviceInfo);
			await buyer.save();
		}
	}

	const testimonialData = [
		{
			id: 1,
			image: 'https://quickiii.s3.ap-south-1.amazonaws.com/uploads/production/1697791707533-manya.jpeg',
			name: 'Mannya',
			address: 'Model Town, Panipat',
			feedback:
				"Ordering on Quickiii has made my lives easier, I don't have to plan anymore, everything gets delivered in just Rs12, No more tension and hassle of taking out a vehicle for shopping."
		},
		{
			id: 2,
			image: 'https://quickiii.s3.ap-south-1.amazonaws.com/uploads/production/1697791707536-VIKAS.jpeg',
			name: 'Vikas Yant',
			address: 'Adarsh Nagar, Panipat',
			feedback:
				'With Quickiii, life has become incredibly convenient, Quickiii is a true blessing.A simple Rs12 order brings me everything I need – dairy products, cosmetics, and a delightful range of food options. My life is so much easier!.'
		},
		{
			id: 3,
			image: 'https://quickiii.s3.ap-south-1.amazonaws.com/uploads/production/1697005036017-Arun%20%20sethi.jpeg',
			name: 'Arun sethi',
			address: 'Bosa ram chowk, Panipat',
			feedback:
				'Quickiii has made life easier by picking out high quality fruits, Vegetables, groceries and even flowers ( bouquet) for me and delivering in 15 min. I don’t feel the need to go the market anymore.'
		},
		{
			id: 4,
			image: 'https://quickiii.s3.ap-south-1.amazonaws.com/uploads/production/1697791707518-men.png',
			name: 'Vibhor',
			address: 'Model Town, Panipat',
			feedback:
				"I can't say enough about Quickiii – it offers a very good service that's remarkably easy to use. It's like having everything I need at one place, making daily tasks a breeze."
		},
		{
			id: 5,
			image: 'https://quickiii.s3.ap-south-1.amazonaws.com/uploads/production/1697791707518-women.png',
			name: 'Mahima',
			address: 'Virat Nagar phase 2, Panipat',
			feedback:
				'Quickiii has taken the stress out of shopping They curate top-grade fruits, veggies, groceries, and even lovely bouquets, all arriving within 15 minutes. The market? Not in my schedule anymore.'
		},
		{
			id: 6,
			image: 'https://quickiii.s3.ap-south-1.amazonaws.com/uploads/production/1697791707518-women.png',
			name: 'Hemali gagneja',
			address: 'Sushant City,Ansals, Panipat',
			feedback:
				'Quickiii is my go-to choice for effortless living,I can order my dairy supplies, cosmetics, and a variety of delectable food items, all delivered to my doorstep.'
		}
	];

	return {
		availableCategory,
		nearbyShops,
		orderAgain,
		mostSelling,
		sellerWithProducts,
		testimonialData
	};
};
export const nearByShops = async (sellers, longitude, latitude) => {
	sellers = sellers.map((seller) => ObjectId(seller));
	const project = {
		name: 1,
		businessName: 1,
		shopStatus: 1,
		distance: 1,
		shopPhotos: 1
	};
	let results = await Seller.aggregate([
		{
			$geoNear: {
				near: { type: 'Point', coordinates: [+longitude, +latitude] },
				distanceField: 'distance',

				$maxDistance: 10000
			}
		},
		{
			$match: {
				_id: { $in: sellers }
			}
		},
		{
			$project: project
		},
		{
			$sort: {
				distance: 1
			}
		}
	]);

	return results;
};

export const recentOrder = async (buyer, sellers) => {
	let recentOrder = await Order.aggregate([
		{
			$match: {
				buyer: ObjectId(buyer),
				seller: { $in: sellers.map((seller) => ObjectId(seller)) }
			}
		},
		{
			$project: {
				seller: 1
			}
		},
		{
			$group: {
				_id: '$seller',
				count: { $sum: 1 }
			}
		},
		{
			$sort: {
				count: -1
			}
		},
		{
			$limit: 5
		}
	]);

	let sellerFromRecentOrders = await Seller.populate(recentOrder, {
		path: '_id',
		select: {
			name: 1,
			businessName: 1,
			shopStatus: 1,
			shopPhotos: 1
		}
	});
	return sellerFromRecentOrders;
};

export const mostSellingShops = async (sellers) => {
	sellers = sellers.map((seller) => ObjectId(seller));
	let mostSellingShops = await Seller.aggregate([
		{
			$match: {
				_id: {
					$in: sellers
				}
			}
		},
		{
			$sort: {
				'orders.total': -1
			}
		},
		{
			$limit: 5
		},
		{
			$project: { name: 1, businessName: 1, shopStatus: 1, shopPhotos: 1 }
		}
	]);
	return mostSellingShops;
};

export const highDiscountProducts = async (sellers) => {
	try {
		let findSeller = await Seller.find({
			featured: true,
			_id: { $in: sellers },
			shopStatus: 'open'
		})
			.select('featured')
			.limit(5)
			.lean();

		let promises = [];

		for (let seller of findSeller) {
			let sellerProducts = await NewProduct.find({
				status: 'active',
				seller: seller?._id,
				featured: true
			})

				.populate({
					path: 'seller',
					select: 'businessName'
				})
				.select('name level1 level2 level3 minPrice description thumbImages seller')
				.limit(10)
				.lean();
			promises.push(sellerProducts);
		}
		const result = await Promise.all(promises).then((res) => res);

		return result;
	} catch (err) {
		console.error(err);
	}
};
// get all buyer for Qbuluickiii admin pannel
export const getAllBuyers = async (queryObj: QueryObj) => {
	try {
		const dbQuery: any = {};

		const dbProject: any = {
			name: 1,
			businessName: 1,
			status: 1,
			contact: 1,
			contactPerson: 1,
			createdAt: 1,
			codBlock: 1,
			otp: 1,
			fcmTokens: 1,
			balance: 1,
			rewardBalance: 1,
			sourceOfDiscovery: 1
		};

		const results = await getResults(
			queryObj,
			Customer,
			dbQuery,
			dbProject,
			'name',
			'name',
			1,
			15
		);

		await Promise.all(
			results.data.map(async (item: any) => {
				if (item._id) {
					const cartCount = await Cart.countDocuments({ buyer: item._id });
					item.cartCount = cartCount;
				}
			})
		);

		// Sort by cartCount
		if (queryObj.sort === 'cartCount') {
			results.data.sort((a: any, b: any) =>
				queryObj.order === 'asc' ? a.cartCount - b.cartCount : b.cartCount - a.cartCount
			);
		}

		return results;
	} catch (error) {
		throw error;
	}
};

export const getBuyerById = async (id) => {
	try {
		let buyer = await Customer.findById(id).lean();

		let cart = await Cart.find({ buyer: id });
		let history = await History.find({ buyer: id });
		return {
			...buyer,
			cart,
			history
		};
	} catch (err) {
		console.error(err);
	}
};

//cart
export const getCart = async (data) => {
	try {
		data.sellers = data?.sellers?.filter((e) => e != '');

		if (!data.sellers.length) return [];
		let seller = data.sellers.map((seller) => ObjectId(seller));
		let results = await Cart.aggregate([
			{
				$match: {
					buyer: ObjectId(data.buyerId),
					status: 'active',
					seller: { $in: seller }
				}
			}
		]);

		let cartData = await NewProduct.populate(results, {
			path: 'product',
			select: {
				minPrice: 1,
				currentStock: 1,
				name: 1,
				description: 1,
				thumbImages: 1,
				minimumOrderQuantity: 1
			}
		});
		let cartRawData = await Seller.populate(cartData, {
			path: 'seller',
			select: { name: 1, businessName: 1, shopStatus: 1, priceTable: 1 }
		});
		let cart = [];
		let sellers: any = {};
		cartRawData.forEach((item: any) => {
			if (sellers[item?.seller?._id]) {
				sellers[item?.seller?._id]['products'] = [
					...sellers[item?.seller?._id]['products'],
					{ ...item.product._doc, itemType: item.itemType, quantity: item.quantity }
				];
			} else {
				sellers[item?.seller?._id] = {
					...item.seller._doc,

					products: [
						{ ...item?.product?._doc, itemType: item.itemType, quantity: item.quantity }
					]
				};
			}
		});
		for (let x in sellers) {
			cart.push(sellers[x]);
		}

		return cart;
	} catch (error) {
		throw error;
	}
};

export const editBuyer = async (data, user) => {
	try {
		if (!user._id) {
			throwError(401);
		}
		let editBuyerDetails = await Customer.findOneAndUpdate(
			{ _id: data._id },
			{ $set: data },
			{ new: true }
		);
		return editBuyerDetails;
	} catch (e) {
		console.error(e);
	}
};

export const sellerByOneSelection = async (data) => {
	try {
		let { sellers, categoryId } = data;

		sellers = sellers.map((seller) => ObjectId(seller));
		let result = await Seller.aggregate([
			{
				$match: {
					_id: {
						$in: sellers
					},
					parentCategory: ObjectId(categoryId)
				}
			},
			{
				$sort: {
					shopStatus: 1,
					position: 1
				}
			},

			{
				$project: { name: 1, businessName: 1, shopStatus: 1, shopPhotos: 1 }
			},
			{
				$limit: 5
			}
		]);

		return result;
	} catch (e) {
		throw e;
	}
};

export const getWalletHistory = async (id: string, queryObj: QueryObj) => {
	try {
		const dbQuery: any = { buyer: ObjectId(id) };

		const dbProject: any = {};

		const results = await getResults(
			queryObj,
			History,
			dbQuery,
			dbProject,
			'name',
			'name',
			1,
			15
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const updateWalletBalanceByAdmin = async (id: string, data: any) => {
	try {
		const { amount, operation, remark } = data;
		let action: string;

		const customer: any = await Customer.findById(ObjectId(id));

		if (!customer) {
			throwError(404);
		}

		if (operation === 'add') {
			customer.balance += amount;
			action = 'credit';
		} else {
			customer.balance -= amount;
			action = 'debit';
		}

		await customer.save();

		await History.create({
			type: 'wallet',
			buyer: id,
			amount: amount,
			date: new Date(),
			action: action,
			remark: remark + ' : action by Admin'
		});

		return;
	} catch (error) {
		throw error;
	}
};
export const updateRewardBalanceByAdmin = async (id: string, data: any) => {
	try {
		const { amount, operation, remark } = data;
		let action: string;

		const customer: any = await Customer.findById(ObjectId(id));

		if (!customer) {
			throwError(404);
		}

		if (operation === 'add') {
			customer.rewardBalance += amount;
			action = 'credit';
		} else {
			customer.rewardBalance -= amount;
			action = 'debit';
		}

		await customer.save();

		await History.create({
			type: 'reward',
			buyer: id,
			amount: amount,
			date: new Date(),
			action: action,
			remark: remark + ' : action by Admin'
		});

		return;
	} catch (error) {
		throw error;
	}
};
