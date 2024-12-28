import { model, Types } from 'mongoose';
import { getResults, getSkip, getSort } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { QueryObj } from '../../middlewares/query';
import CategoryModel from '../../models/category/category';
import { ICustomer } from '../../models/customer/customer';
import seller from '../../models/customer/seller';
import { ISeller } from '../../models/customer/seller';
import { IWishlist } from '../../models/customer/wishlist';
import { IPrice } from '../../models/seller/price';
import { IProduct } from '../../models/seller/product';

const NewProduct = model<IProduct>('NewProduct');
const Wishlist = model<IWishlist>('Wishlist');
const Customer = model<ICustomer>('Customer');
const Price = model<IPrice>('Price');
const Seller = model<ISeller>('NewCustomer');
const ObjectId = Types.ObjectId;

export const getAvailableCategory = async (queryObj, data) => {
	let sellers = data.sellers;

	let serviceableSellers = await Seller.find({ _id: { $in: sellers } }, { parentCategory: 1 });
	let availableCategoryIDs = [
		...new Set(serviceableSellers.reduce((acc, curr) => [...acc, ...curr.parentCategory], []))
	];

	let availableCategories = await CategoryModel.aggregate([
		{
			$match: {
				level: 1,
				status: 'active'
			}
		},
		{
			$addFields: {
				available: {
					$cond: {
						if: {
							$in: ['$_id', availableCategoryIDs]
						},
						then: true,
						else: false
					}
				}
			}
		},
		{
			$project: {
				available: 1,
				status: 1,
				name: 1,
				image: 1,
				thumb: 1,
				position: 1
			}
		},
		{
			$sort: {
				available: -1,
				position: 1
			}
		}
	]);

	return availableCategories;
};

export const getProductById = async (id: string, data: any, user) => {
	try {
		let product = await NewProduct.findOne({
			_id: id,
			status: 'active'
		})
			.populate({
				path: 'prices',
				match: {
					status: 'active',
					seller: { $in: data.sellers }
				},
				populate: {
					path: 'seller',
					select: 'name businessName shopStatus'
				}
			})
			.populate('level1', '_id name returnPeriod')
			.populate('level2', '_id name')
			.populate('level3', '_id name')
			.populate('level4', '_id name')
			.populate('specifications.specification', '_id name')
			.populate('specifications.values.value', '_id name')
			.lean();

		if (!product) {
			throwError(404);
		}

		// const wishlistItem = await Wishlist.findOne({
		// 	status: 'active',
		// 	buyer: user._id,
		// 	product: product._id
		// });
		return { ...product };
	} catch (error) {
		throw error;
	}
};
// not in use
export const getRecommendedProducts = async (data: any, queryObj: QueryObj) => {
	try {
		const sellers = data.sellers.map((seller) => ObjectId(seller));

		const priceQuery: any = {
			status: 'active'
			// seller: { $in: sellers }
		};
		const dbProject: any = {
			product: 0
		};
		const results = await Price.aggregate([
			{
				$match: {
					...priceQuery
				}
			},
			{
				$addFields: {
					margin: {
						$divide: [{ $subtract: ['$price', '$sellingPrice'] }, '$price']
					}
				}
			},
			{
				$group: {
					_id: '$product',
					margin: { $first: '$margin' }
				}
			},
			{
				$sort: getSort(queryObj, 'name', 1)
			},
			{
				$skip: getSkip(queryObj, +queryObj.limit)
			},
			{
				$limit: +queryObj.limit
			},
			{
				$lookup: {
					from: 'products',
					let: { productId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$_id', '$$productId'] },
										{ $eq: ['$status', 'active'] }
									]
								}
							}
						},
						{
							$lookup: {
								from: 'prices',
								let: { productId: '$_id' },
								pipeline: [
									{
										$match: {
											$expr: {
												$and: [
													{ $eq: ['$product', '$$productId'] },
													{ $eq: ['$status', 'active'] },
													{ $in: ['$seller', sellers] }
												]
											}
										}
									}
								],
								as: 'prices'
							}
						}
					],
					as: 'product'
				}
			},
			{
				$unwind: '$product'
			},
			{
				$facet: {
					data: [
						{
							$replaceRoot: {
								newRoot: '$product'
							}
						},
						{
							$project: {
								...dbProject
							}
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

export const getProductsByCategoryAndLevel = async (level, category, data, queryObj) => {
	try {
		level = +level;
		category = ObjectId(category);
		const sellers = data.sellers.map((seller) => ObjectId(seller));

		const priceQuery: any = {
			status: 'active',
			seller: { $in: sellers }
		};

		const productQuery: any = {
			...(level === 1
				? { level1: category }
				: level === 2
				? { level2: category }
				: level === 3
				? { level3: category }
				: { level4: category })
		};

		const dbProject: any = {
			'prices.product': 0
		};

		let products = await NewProduct.aggregate([
			{
				$match: {
					...priceQuery,
					...productQuery
				}
			},
			{
				$project: {
					name: 1,
					thumbImages: 1,
					description: 1,
					sellingPrice: '$minPrice.sellingPrice',
					price: '$minPrice.price',
					seller: 1,
					level1: 1,
					level2: 1,
					level3: 1,
					level4: 1
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

						{
							$skip: getSkip(queryObj, +queryObj.limit)
						},
						{
							$limit: +queryObj.limit
						},
						{
							$sort: getSort(queryObj, 'name', 1)
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
		let productArray = products[0].data;

		const indexToMove = productArray.findIndex((e) => e._id.toString() == data?.product); // Find the index of the value 5
		if (indexToMove !== -1) {
			let sharedProductObject = productArray[indexToMove];
			productArray.splice(indexToMove, 1); // Remove the value 5 from its current position
			productArray.unshift(sharedProductObject); // Add the value 5 at the beginning of the array
		}
		if (data.product) {
			let product: any = await NewProduct.findOne({ _id: data.product }).lean();
			if (product) {
				product = { ...product, ...product.minPrice };
				productArray.unshift(product);
			}
		}

		return {
			data: productArray,

			total: 0
		};
	} catch (error) {
		throw error;
	}
};
