import { model, Types } from 'mongoose';
import { getResults, getSkip, getSort } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { QueryObj } from '../../middlewares/query';
import { ICategory } from '../../models/category/category';
import { ICustomer } from '../../models/customer/customer';
import seller from '../../models/customer/seller';
import { ISeller } from '../../models/customer/seller';
import { IWishlist } from '../../models/customer/wishlist';
import { IPrice } from '../../models/seller/price';
import { IProduct } from '../../models/seller/product';
import { IAreas } from '../../models/locations/goodAreas';
import { ISellerCategory } from '../../models/seller/seller-category';

const Seller = model<ISeller>('NewCustomer');
const SellerCategory = model<ISellerCategory>('SellerCategory');
const Customer = model<ICustomer>('Customer');
const Price = model<IPrice>('Price');
const NewProduct = model<IProduct>('NewProduct');
const Wishlist = model<IWishlist>('Wishlist');
const ObjectId = Types.ObjectId;
const GoodAreas = model<IAreas>('Areas');
export const getSellersByStatus = async (
	status: 'running' | 'non-running',
	queryObj: QueryObj,
	user
) => {
	try {
		let buyerCategories = await Seller.findById(user._id).select('level4');

		let dbQuery = {
			_id: { $ne: buyerCategories._id },

			approved: true,
			status: 'active',
			level4: { $in: buyerCategories.level4 },
			'runningItems.0': { $exists: status === 'running' }
		};

		let projection = {
			name: 1,
			businessName: 1,
			avatar: 1,
			shopPhotos: 1,
			categories: { l1: 1 },
			priceTable: 1,
			runningOrder: 1
		};

		let populations = [
			{
				path: 'categories.l1',
				select: 'name'
			},
			'runningOrder'
		];

		let results = await getResults(
			queryObj,
			Customer,
			dbQuery,
			projection,
			'businessName',
			'businessName',
			1,
			10,
			populations
		);

		for (let result of results.data) {
			let runningWishlist = null;
			if (result.runningOrder) {
				runningWishlist = await Wishlist.findOne({
					status: 'active',
					buyer: user._id,
					groupOrder: result.runningOrder._id
				});
			}
			result.runningWishlist = runningWishlist;
			const sellerWishlist = await Wishlist.findOne({
				status: 'active',
				buyer: user._id,
				seller: result._id
			});
			result.sellerWishlist = sellerWishlist;
		}

		return results;
	} catch (error) {
		throw error;
	}
};

export const getAllSellers = async (queryObj: QueryObj, data, user) => {
	try {
		let sellers = data.sellers.map((e) => ObjectId(e));
		let dbQuery = {
			_id: { $in: sellers },

			approved: true,
			status: 'active'
		};
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
			ratingBuyerToRider: 1,
			ratingBuyerToSeller: 1
		};

		let allSellers = await Seller.aggregate([
			{
				$match: dbQuery
			},
			{
				$project: projection
			}
		]);

		let results = await getResults(
			queryObj,
			Seller,
			dbQuery,
			projection,
			'businessName',
			'shopStatus: -1, businessName: 1',
			1,
			10
		);

		return allSellers;
	} catch (error) {
		throw error;
	}
};

export const getParentCategory = async (seller, user) => {
	try {
		let buyerCategories = await Seller.findById(user._id).select('categories level4');

		const categories = await Seller.find({
			_id: seller,
			'categories.l1': { $in: buyerCategories.categories.map((l1) => l1.l1) }
		})
			.populate('categories.l1', 'name thumb status')
			.populate('categories.sub.l2', 'name thumb status')
			.populate('categories.sub.sub.l3', 'name thumb status')
			.populate('categories.sub.sub.sub', 'name thumb status')
			.select('categories');

		if (!categories) {
			throwError(404);
		}

		return categories;
	} catch (error) {
		throw error;
	}
};

export const getSubCategories = async (id) => {
	try {
		let customer = await Seller.findById(id).select('categories');

		if (!customer) {
			throwError(404);
		}

		return customer.categories || [];
	} catch (error) {
		throw error;
	}
};

export const getProductsByCategory = async (
	seller: string,
	data: any,
	queryObj: QueryObj,
	user: any
) => {
	try {
		const sellers = data.sellers.map((seller) => ObjectId(seller));

		const priceQuery: any = {
			status: 'active',
			seller: { $in: sellers }
		};

		const productQuery: any = {
			'product.level4': { $in: data.categories.map((item) => ObjectId(item)) || [] }
		};

		const dbProject: any = {};

		let products = await NewProduct.aggregate([
			{
				$match: {
					...priceQuery
				}
			},

			{
				$match: {
					...productQuery
				}
			},
			{
				$group: {
					_id: '$product._id',
					name: { $first: '$product.name' },
					description: { $first: '$product.description' },
					thumbImages: { $first: '$product.thumbImages' },
					prices: { $push: '$$ROOT' }
				}
			},
			{
				$facet: {
					data: [
						{
							$replaceRoot: {
								newRoot: {
									$mergeObjects: ['$product', '$$ROOT']
								}
							}
						},
						// {
						// 	$project: {
						// 		...dbProject
						// 	}
						// },
						{
							$sort: getSort(queryObj, 'name', 1)
						},
						{
							$skip: getSkip(queryObj, +queryObj.limit)
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

export const getSellersByLocation = async (locationId: any, queryObj: QueryObj, user: any) => {
	try {
		const dbQuery = {
			status: 'active',

			approved: true,
			servicableLocations: locationId
		};
		const project = {
			name: 1,
			businessName: 1,
			shopStatus: 1
		};

		const results = await getResults(
			queryObj,
			Seller,
			dbQuery,
			project,
			'businessName',
			'businessName',
			1,
			10
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const getSellersByLocationCoordinates = async (queryObj: QueryObj, user: any) => {
	try {
		const project = {
			name: 1,
			businessName: 1,
			shopStatus: 1,
			distance: 1
		};
		let { longitude, latitude } = queryObj;

		let checkGoodArea = await GoodAreas.findOne({
			loc: {
				$geoIntersects: {
					$geometry: {
						type: 'Point',
						coordinates: [+longitude, +latitude]
					}
				}
			}
		});
		// comment this if statement for testing purpose
		if (!checkGoodArea) {
			return [];
		}

		let buyerUpdatedLatestLocation = await Customer.updateOne(
			{ _id: user._id },
			{
				$set: {
					latestLocation: {
						coordinates: [longitude, latitude]
					}
				}
			}
		);

		let results = await Seller.aggregate([
			{
				$geoNear: {
					near: {
						type: 'Point',
						coordinates: [+longitude, +latitude]
					},
					distanceField: 'distance',
					maxDistance: 10000,
					query: {
						status: 'active',
						approved: true
					},
					project: project
				}
			}
		]);

		results = results.filter((e) => e.distance < 6000);

		return results;
	} catch (error) {
		throw error;
	}
};
