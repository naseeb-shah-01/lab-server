import { setSessionById, getSessionById } from '../../helpers/server-helper';
import { model, Types } from 'mongoose';
import { ICustomer } from '../../models/customer/customer';
import { throwError } from '../../helpers/throw-errors';
import { deletePrivateProps, getResults, getSkip, getSort } from '../../helpers/query';
import { QueryObj } from '../../middlewares/query';
import { Request, Response } from 'express';
import { ICategory } from '../../models/category/category';
import { IPrice } from '../../models/seller/price';
import { IProduct } from '../../models/seller/product';
import { createSellerNotification } from '../../helpers/notifications/seller';
import { INotification } from '../../models/notification/notification';
import { sendFCMNotification } from '../../helpers/notifications/fcm';
import { createBuyerNotification } from '../../helpers/notifications/buyer';
import {
	sendBuyerNotification,
	sendSellerNotification
} from '../../helpers/notifications/notification';
import { IOrder } from '../../models/order/order';
import { ISpecification } from '../../models/category/specification';
import { IVersion } from '../../models/general/version';
import { ISeller } from '../../models/customer/seller';
import { decreaseProductCountInCategory } from '../seller/seller';
import { startOfDay } from 'date-fns';
import { ISettlement } from '../../models/general/settlement';
import { ISubscription } from '../../models/customer/subscription';
import { IPenalty } from '../../models/general/penalty';
import { ISellerCategory } from '../../models/seller/seller-category';
import { ICoupon } from '../../models/customer/coupons';
import { createThumbWithBuffer } from '../../helpers/thumb';
const Seller = model<ISeller>('NewCustomer');
const Settlement = model<ISettlement>('Settlement');
const ObjectId = Types.ObjectId;
const Customer = model<ICustomer>('Customer');
const Category = model<ICategory>('Category');
const NewProduct = model<IProduct>('NewProduct');
const Order = model<IOrder>('Order');
const Price = model<IPrice>('Price');
const Specification = model<ISpecification>('Specification');
const Version = model<IVersion>('Version');
const Subscription = model<ISubscription>('Subscription');
const Penalty = model<IPenalty>('Penalty');
const SellerCategory = model<ISellerCategory>('SellerCategory');
const Coupon = model<ICoupon>('Coupon');

export const getSellers = async (queryObj: QueryObj) => {
	try {
		const dbQuery: any = {};

		// if (queryObj?.kycType === 'seller') {
		// 	dbQuery.kyc = true;
		// 	dbQuery.approved = true;
		// } else if (queryObj?.kycType === 'buyer') {
		// }

		const dbProject: any = {
			name: 1,
			businessName: 1,
			status: 1,
			contact: 1,
			buyer: 1,
			seller: 1,
			shopStatus: 1,
			contactPerson: 1,
			register: 1,
			approved: 1,
			featured: 1,
			premium: 1,
			kyc: 1,
			kycType: 1,
			createdAt: 1,
			codBlock: 1,
			otp: 1,
			fcmTokens: 1,
			beneficiaryCreated: 1,
			rating: 1
		};

		const results = await getResults(
			queryObj,
			Seller,
			dbQuery,
			dbProject,
			'businessName',
			'businessName',
			1,
			15
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const getApprovalSeller = async (queryObj: QueryObj) => {
	try {
		const dbQuery: any = {
			approved: false,
			kyc: true
		};

		const dbProject: any = {
			name: 1,
			businessName: 1,
			status: 1,
			contact: 1,
			contactPerson: 1,
			register: 1,
			approved: 1,
			kyc: 1,
			kycType: 1,
			createdAt: 1
		};

		const results = await getResults(
			queryObj,
			Seller,
			dbQuery,
			dbProject,
			'businessName',
			'businessName',
			1,
			15
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const getPendingCustomer = async (queryObj: QueryObj) => {
	try {
		const dbQuery: any = {
			kyc: false
		};

		const dbProject: any = {
			name: 1,
			businessName: 1,
			status: 1,
			contact: 1,
			contactPerson: 1,
			register: 1,
			approved: 1,
			kyc: 1,
			kycType: 1,
			createdAt: 1
		};

		const results = await getResults(
			queryObj,
			Seller,
			dbQuery,
			dbProject,
			'businessName',
			'businessName',
			1,
			15
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const getCustomerById = async (id: string, data: any) => {
	try {
		let { startDate, endDate } = data;
		if (!startDate || !endDate) {
			startDate = startOfDay(new Date());
			endDate = new Date();
		} else {
			startDate = new Date(startDate);
			endDate = new Date(endDate);
		}
		let seller = await Seller.findById(id).lean();

		const turnInOrderIds = await Order.distinct('_id', {
			seller: id,
			'currentStatus.status': 'placed',
			'accepted.status': { $ne: true },
			'cancelled.status': { $ne: true },
			'rejected.status': { $ne: true }
		});

		let subscription;
		if (!data.startDate || !data.endDate) {
			subscription = await Subscription.find({
				seller: id
			}).limit(5);
		} else {
			subscription = await Subscription.find({
				seller: id,
				createdAt: {
					$gte: startDate,
					$lte: endDate
				}
			});
		}
		let penalty;
		if (!data.startDate || !data.endDate) {
			penalty = await Penalty.find({
				seller: id
			}).limit(5);
		} else {
			penalty = await Penalty.find({
				seller: id,
				createdAt: {
					$gte: startDate,
					$lte: endDate
				}
			});
		}
		let settelement;
		if (!data.startDate || !data.endDate) {
			settelement = await Settlement.find({
				seller: id
			}).limit(5);
		} else {
			settelement = await Settlement.find({
				seller: id,
				createdAt: {
					$gte: startDate,
					$lte: endDate
				}
			});
		}

		const sellerCategories = await SellerCategory.find({ seller: id, level: 1 });
		const coupons = await Coupon.find({ seller: { $in: [id] } });
		seller.orders.rejected = (
			await Order.find({ seller: { $in: [id] }, 'rejected.status': true })
		).length;
		seller.orders.partialAccepted = await Order.countDocuments({
			seller: { $in: [id] },
			$expr: { $gt: [{ $size: '$rejectedItems' }, 0] }
		});

		const totalAmtResult = await Order.aggregate([
			{ $match: { seller: { $in: [ObjectId(id)] }, 'delivered.status': true } },
			{ $group: { _id: null, totalAmt: { $sum: '$order.totalAmt' } } }
		]);

		if (totalAmtResult.length > 0) {
			seller.orders.totalAmt = totalAmtResult[0].totalAmt;
		} else {
			seller.orders.totalAmt = 0;
		}

		return {
			...seller,
			turnInPending: !!turnInOrderIds.length,
			penalty,
			subscription,
			settelement,
			sellerCategories,
			coupons
		};
	} catch (error) {
		throw error;
	}
};

export const getCustomerSelectedCategory = async (id: string) => {
	try {
		let customer = await Seller.findById(id)
			.populate('categories.l1', 'name thumb status')
			.populate('categories.sub.l2', 'name thumb status')
			.populate('categories.sub.sub.l3', 'name thumb status')
			.populate('categories.sub.sub.sub', 'name thumb status')
			.select('categories');

		if (!customer) {
			throwError(404);
		}

		return customer.categories || [];
	} catch (error) {
		throw error;
	}
};

export const updateStatusCustomer = async (id: string, status: string, user) => {
	try {
		if (!status || !['active', 'inactive'].includes(status)) {
			throwError(400);
		}

		let customer = await Seller.findById(id).select({
			otp: 0,
			sessions: 0,
			fcmTokens: 0,
			kycDocument: 0
		});

		if (!customer) {
			throwError(404);
		}

		customer.status = status as any;
		customer.updatedBy = user?._id || null;
		await customer.save();

		sendAccountStatusNotifications(customer._id);

		for (let socket of customer.sockets || []) {
			global.io.to(socket).emit('accountDisabled', {});
		}

		return customer;
	} catch (error) {
		throw error;
	}
};
export const updateSellerBeneficiary = async (id: string, status: string, user) => {
	try {
		if (!status || !['true', 'false'].includes(status)) {
			throwError(400);
		}

		let seller = await Seller.findById({ _id: id });

		if (!seller) {
			throwError(404);
		}

		seller.beneficiaryCreated = status === 'true' ? true : false;
		await seller.save();
	} catch (error) {
		throw error;
	}
};
export const updateFeaturedSeller = async (id: string, status: string, user) => {
	try {
		if (!status || !['true', 'false'].includes(status)) {
			throwError(400);
		}

		let seller = await Seller.findById({ _id: id });

		if (!seller) {
			throwError(404);
		}

		seller.featured = status === 'true' ? true : false;
		await seller.save();
	} catch (error) {
		throw error;
	}
};
export const updatePremiumSeller = async (id: string, status: string, user) => {
	try {
		if (!status || !['true', 'false'].includes(status)) {
			throwError(400);
		}

		let seller = await Seller.findById({ _id: id });

		if (!seller) {
			throwError(404);
		}

		seller.premium = status === 'true' ? true : false;
		await seller.save();
	} catch (error) {
		throw error;
	}
};

export const updateSellerShopStatus = async (status: 'open' | 'closed', user) => {
	try {
		if (!status || !['open', 'closed'].includes(status)) {
			throwError(400);
		}
		let seller = await Seller.findById({ _id: user._id });

		if (!seller) {
			throwError(404);
		}

		seller.shopStatus = status;
		await seller.save();
		return seller;
	} catch (error) {
		throw error;
	}
};

const sendAccountStatusNotifications = async (customerId: string) => {
	try {
		const customer = await Seller.findById(customerId);
		if (customer) {
			if (customer.seller) {
				const sellerNotification = createSellerNotification(
					customer.status === 'active'
						? 'SELLER_ACCOUNT_ENABLED'
						: 'SELLER_ACCOUNT_DISABLED',
					customer._id.toString(),
					null
				);
				sendSellerNotification(sellerNotification);
			} else {
				const buyerNotification = createBuyerNotification(
					customer.status === 'active'
						? 'BUYER_ACCOUNT_ENABLED'
						: 'BUYER_ACCOUNT_DISABLED',
					customer._id.toString(),
					null
				);
				sendBuyerNotification(buyerNotification);
			}
		}
	} catch (error) {
		console.error(error);
	}
};

export const approveCustomer = async (id: string, status: string, user) => {
	try {
		if (!status || !['true', 'false'].includes(status)) {
			throwError(400);
		}

		let customer = await Seller.findById(id).select({
			otp: 0,
			sessions: 0,
			fcmTokens: 0,
			kycDocument: 0
		});

		if (!customer) {
			throwError(404);
		}

		customer.approved = status as any;
		customer.updatedBy = user?._id || null;
		await customer.save();

		sendApprovalNotifications(customer._id.toString());

		return customer;
	} catch (error) {
		throw error;
	}
};

const sendApprovalNotifications = async (sellerId: string) => {
	try {
		const sellerNotification = createSellerNotification(
			'SELLER_ACCOUNT_APPROVED',
			sellerId.toString(),
			null
		);
		sendSellerNotification(sellerNotification);
	} catch (error) {
		console.error(error);
	}
};

export const validateKyc = async (
	req: Request,
	res: Response,
	data: ICustomer,
	cb: (upload: boolean) => {},
	file: any
) => {
	let files: any = req.files;
	let customer = await Seller.findById(req.params.id);
	if (!customer) {
		res.errorRes(404);
		cb(false);
		return;
	}
	if (
		data?.kycDocument &&
		!(
			data?.kycDocument?.gstCertificate?.length ||
			data?.kycDocument?.udyamAdhar?.length ||
			data?.kycDocument?.shopLicense?.length ||
			data?.kycDocument?.tradeCertificate?.length ||
			data?.kycDocument?.fssaiRegistration?.length ||
			data?.kycDocument?.drugLicense?.length ||
			data?.kycDocument?.accountCheque?.length
		) &&
		!files.length
	) {
		res.errorRes(400);
		cb(false);
		return;
	}
	if (files?.length) {
		for (const file of files) {
			if ((file?.fieldname === '' || file?.fieldname === 'udyamAdhar') && !data?.gst) {
				res.errorRes(400);
				cb(false);
				return;
			}
		}
	}
	if (
		(data?.kycDocument?.gstCertificate?.length || data?.kycDocument?.udyamAdhar?.length) &&
		!data?.gst
	) {
		res.errorRes(400);
		cb(false);
		return;
	}
	cb(true);
	return;
};

export const updateShopPhotos = async (body, files, user) => {
	try {
		let { _id } = body;
		const businessProfile = await Seller.findOne({
			_id,
			status: 'active'
		});

		if (!businessProfile) {
			throwError(404);
		}
		const shopPhotos = body.shopPhotos || [];
		if (files.length) {
			for (let file of files) {
				if (file.fieldname === 'newShopPhotos') {
					const thumb = await createThumbWithBuffer(file.location, 600);
					shopPhotos.push({
						thumb: thumb,
						image: file.location
					});
				}
			}
		}

		businessProfile.shopPhotos = shopPhotos;
		businessProfile.save();

		return businessProfile;
	} catch (error) {
		throw error;
	}
};

export const updateSellerPresnolDetails = async (data, user) => {
	const { _id, updateData } = data;
	try {
		// Find the seller by ID and update the fields
		let seller = await Seller.findOneAndUpdate({ _id }, updateData, { new: true });
		return;
	} catch (error) {
		console.error('Error updating seller:', error);
		throw error;
	}
};
export const updateKycDocument = async (id, data, files, user) => {
	try {
		data = deletePrivateProps(data);
		let kycDocument = data?.kycDocument ? data.kycDocument : {};
		if (files.length) {
			for (let file of files) {
				if (!kycDocument.hasOwnProperty(file.fieldname)) {
					kycDocument[file.fieldname] = [file.location];
				} else {
					kycDocument[file.fieldname].push(file.location);
				}
			}
		}
		data.kycDocument = kycDocument;

		data.updatedBy = user?._id;
		let customer = await Seller.findByIdAndUpdate(
			id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();

		delete customer.otp;
		delete customer.sessions;
		delete customer.fcmTokens;

		return customer;
	} catch (error) {
		throw error;
	}
};

export const updatePriceTable = async (id, data, user) => {
	try {
		if (!data.priceTable) {
			throwError(400);
		}

		const customer = await Seller.findOneAndUpdate(
			{
				_id: id
			},
			{
				$set: { priceTable: data.priceTable }
			},
			{
				new: true,
				useFindAndModify: false
			}
		).lean();

		sendPriceTableNotifications(customer._id.toString());

		return customer.priceTable;
	} catch (error) {
		throw error;
	}
};

const sendPriceTableNotifications = async (sellerId: string) => {
	try {
		const sellerNotification = createSellerNotification(
			'SELLER_PRICE_TABLE_UPDATED',
			sellerId.toString(),
			null
		);
		sendSellerNotification(sellerNotification);
	} catch (error) {
		console.error(error);
	}
};

export const getTopCategory = async (id) => {
	try {
		const customer = await Seller.findById(id)
			.populate('categories.l1', 'name thumb status')
			.select('categories');
		if (!customer) {
			throwError(404);
		}

		return customer.categories || [];
	} catch (error) {
		throw error;
	}
};

export const getSubCategories = async (id, level: number, parent) => {
	try {
		level = +level;
		if (![2, 3, 4].includes(level)) {
			throwError(400);
		}

		const dbQuery = Seller.findById(id);

		if (level === 2) {
			dbQuery.populate('categories.sub.l2', 'name thumb status');
			dbQuery.populate('categories.sub.sub.l3', 'name thumb status');
		}
		if (level === 3) {
			dbQuery.populate('categories.sub.sub.l3', 'name thumb status');
			dbQuery.populate('categories.sub.sub.sub', 'name thumb status');
		}
		if (level === 4) {
			dbQuery.populate('categories.sub', 'name thumb status');
			dbQuery.populate('categories.sub.sub', 'name thumb status');
			dbQuery.populate('categories.sub.sub.sub', 'name thumb status');
		}
		dbQuery.select('categories');

		const customer = await dbQuery;
		if (!customer || !customer.categories || !customer.categories.length) {
			throwError(404);
		}
		let sub = null;
		if (level === 2) {
			const l1 = customer.categories.find((c) => c.l1.toString() === parent.toString());
			sub = l1 ? l1.sub || [] : null;
		}
		if (level === 3) {
			let l2 = null;
			for (let l1 of customer.categories) {
				if (l1.sub && l1.sub.length) {
					l2 = l1.sub.find((c) => c.l2.toString() === parent.toString());
					if (l2) {
						break;
					}
				}
			}
			sub = l2 ? l2.sub || [] : null;
		}
		if (level === 4) {
			let l3 = null;
			loop1: for (let l1 of customer.categories) {
				if (l1.sub && l1.sub.length) {
					loop2: for (let l2 of l1.sub) {
						if (l2.sub && l2.sub.length) {
							l3 = l2.sub.find((c) => c.l3.toString() === parent.toString());
							if (l3) {
								break loop2;
							}
						}
					}
				}
				if (l3) {
					break loop1;
				}
			}
			sub = l3 ? l3.sub : null;
		}

		if (!sub) {
			throwError(404);
		}
		return sub;
	} catch (error) {
		throw error;
	}
};

export const getProductById = async (productId) => {
	try {
		let product = await NewProduct.findOne({
			_id: productId
		})
			.populate('level1', '_id returnPeriod')
			.populate('specifications.specification')
			.populate('specifications.values.value')
			.populate('single.variants.specifications.specification')
			.populate('single.variants.specifications.value')
			.populate('sets.variants.specifications.specification')
			.populate('sets.variants.specifications.value')
			.lean();

		if (!product) {
			throwError(404);
		}

		return product;
	} catch (error) {
		throw error;
	}
};

export const getAllProducts = async (queryObj: QueryObj) => {
	try {
		let { extraParams } = queryObj;
		let allSellers = await Seller.find({}).select('businessName');
		let selectedSeller;

		extraParams = JSON.parse(extraParams);

		if (extraParams && extraParams.seller) {
			selectedSeller = await Seller.findById(extraParams.seller);
			if (!selectedSeller) {
				// Handle the case when the specified seller ID is not found
				throw new Error('Seller not found');
			}
		} else {
			selectedSeller = await Seller.find({}).select('businessName');
		}

		const dbProject: any = {
			name: 1,
			thumbImages: 1,
			single: 1,
			minPrice: 1,
			seller: 1,
			status: 1,
			featured: 1,
			type: 1,
			description: 1,
			createdAt: 1
		};

		const populations = [];
		let filter: any = {};

		if (extraParams && extraParams.seller) {
			filter.seller = extraParams.seller;
		} else {
			filter = {};
		}

		const selectedSellerProducts = await getResults(
			queryObj,
			NewProduct,
			filter,
			dbProject,
			'name',
			'name',
			1,
			15,
			populations
		);

		return {
			...selectedSellerProducts,
			selectedSeller,
			allSellers
		};
	} catch (error) {
		throw error;
	}
};

export const getProductListByStatus = async (queryObj: QueryObj, id: string, type: string) => {
	try {
		const dbQuery: any = {
			status: type === 'deleted' ? 'deleted' : 'inactive',
			seller: id
		};

		const dbProject: any = {
			name: 1,
			thumbImages: 1
		};

		const results = await getResults(
			queryObj,
			NewProduct,
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

export const bulkUpdateProduct = async (id: string, data: any, user) => {
	try {
		data = deletePrivateProps(data);

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

export const updateProductStatus = async (id: string, status: string, data: any, user) => {
	try {
		if (!status || !['active', 'inactive'].includes(status)) {
			throwError(400);
		}

		// if (status === 'active' && !(data.expiry >= 0 && data.expiryUnit)) {
		// 	throwError(400);
		// }

		let product = await NewProduct.findOne({
			_id: id,
			status: { $ne: 'deleted' }
		});

		if (!product) {
			throwError(404);
		}

		// if (status === 'active') {
		// 	product.expiryUnit = data.expiryUnit;
		// 	product.expiry = data.expiry;
		// }
		product.status = status as any;
		product.updatedBy = user?._id || null;
		await product.save();

		return product;
	} catch (error) {
		throw error;
	}
};

export const updateSellerProductStatus = async (
	id: string,
	status: 'active' | 'deleted' | 'inactive',
	sellerId: string
) => {
	try {
		if (!status || !['active', 'inactive'].includes(status)) {
			throwError(400);
		}

		let product = await NewProduct.findOne({
			_id: id,
			status: { $ne: 'deleted' }
		});
		// .populate({
		// 	path: 'prices',
		// 	match: { seller: sellerId }
		// });

		if (!product) {
			throwError(404);
		}

		//Add data in prices collection if product is enabled for the first time
		// let price;
		// if (status === 'active' && !product.prices.length) {
		// 	price = new Price({
		// 		_id: `${sellerId}_${id}`,
		// 		product: id,
		// 		seller: sellerId,
		// 		currentStock: 1000,
		// 		...product.minPrice,
		// 		sellingPrice: product.minPrice.price
		// 	});
		// } else {
		// 	price = await Price.findOne({
		// 		_id: `${sellerId}_${id}`,
		// 		status: { $ne: 'deleted' }
		// 	});
		// }
		product.status = status;
		await product.save();

		sendProductStatusNotifications(sellerId, product._id.toString());

		product = await NewProduct.findOne({
			_id: id,
			status: { $ne: 'deleted' }
		});

		return product;
	} catch (error) {
		throw error;
	}
};

const sendProductStatusNotifications = async (sellerId: string, productId: string) => {
	try {
		const product = await NewProduct.findById(productId);
		// const price = await Price.findById(`${sellerId}_${productId}`);
		const sellerNotification = createSellerNotification(
			product.status === 'active' ? 'SELLER_PRODUCT_ENABLED' : 'SELLER_PRODUCT_DISABLED',
			sellerId,
			product
		);
		sendSellerNotification(sellerNotification);
	} catch (error) {
		console.error(error);
	}
};

export const deleteProduct = async (id: string, user) => {
	try {
		let data = await NewProduct.findById(id);
		let categoryToDecreaseProductCount = data.level4
			? data.level4
			: data.level3
			? data.level3
			: data.level2;
		let levelOfCategory = data.level4 ? 4 : data.level3 ? 3 : 2;
		let product = await NewProduct.deleteOne({
			_id: id
		});

		// await decreaseProductCountInCategory(categoryToDecreaseProductCount, levelOfCategory);

		return {
			status: 200,
			message: 'Product deleted successfully'
		};
	} catch (error) {
		throw error;
	}
};

export const getProductsByCategoryAndLevel = async (level, category, id, queryObj) => {
	try {
		level = +level;
		category = ObjectId(category);

		const priceQuery: any = {
			status: 'active',
			seller: ObjectId(id)
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
			name: 1,
			thumbImages: 1,
			description: 1,
			minPrice: 1,
			...(queryObj.search ? { score: { $meta: 'searchScore' } } : {})
		};

		const searchStage = {
			$match: {
				name: {
					$regex: queryObj.search,
					$options: 'i'
				}
			}

			// $search: {
			// 	text: {
			// 		query: queryObj.search,
			// 		path: 'name',
			// 		fuzzy: {
			// 			maxEdits: 2
			// 		}
			// 	}
			// }
		};

		let products = await NewProduct.aggregate([
			...(queryObj.search ? [searchStage] : []),
			{
				$match: {
					...productQuery
				}
			},
			// {
			// 	$lookup: {
			// 		from: 'prices',
			// 		let: { productId: '$_id' },
			// 		pipeline: [
			// 			{
			// 				$match: {
			// 					$expr: {
			// 						$and: [
			// 							{ $eq: ['$product', '$$productId'] },
			// 							{ $eq: ['$status', 'active'] },
			// 							{ $eq: ['$seller', ObjectId(id)] }
			// 						]
			// 					}
			// 				}
			// 			}
			// 		],
			// 		as: 'minPrice'
			// 	}
			// },
			{
				$unwind: {
					path: '$minPrice',
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$facet: {
					data: [
						{
							$project: {
								...dbProject
							}
						},
						{
							$sort: {
								...(queryObj.search ? { score: -1 } : {}),
								...getSort(queryObj, 'name', 1)
							}
						},
						{
							$skip: getSkip(queryObj, queryObj.limit)
						},
						{
							$limit: queryObj.limit
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
			total: products[0].count?.[0]?.total || 0,
			page: queryObj.page || 1,
			limit: queryObj.limit || 10,
			order: queryObj.order || 'asc',
			sort: queryObj.sort || 'name'
		};
	} catch (error) {
		throw error;
	}
};

export const getCategoryById = async (categoryId: string) => {
	try {
		const category = await Category.findOne({
			_id: categoryId
		})
			.select('name status')
			.lean();
		return category;
	} catch (error) {
		throw error;
	}
};

export const updateSellerPrice = async (priceId: string, data: any) => {
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

export const getAllCategories = async () => {
	try {
		let results = await Category.aggregate([
			{
				$match: {
					level: 1
				}
			},
			{
				$sort: { position: 1 }
			},
			{
				$lookup: {
					from: 'categories',
					let: { categoryLevel1: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$level1', '$$categoryLevel1'] },
										{ $eq: ['$level', 2] }
									]
								}
							}
						},
						{
							$lookup: {
								from: 'categories',
								let: { categoryLevel2: '$_id' },
								pipeline: [
									{
										$match: {
											$expr: {
												$and: [
													{ $eq: ['$level2', '$$categoryLevel2'] },
													{ $eq: ['$level', 3] }
												]
											}
										}
									},
									{
										$lookup: {
											from: 'categories',
											let: { categoryLevel3: '$_id' },
											pipeline: [
												{
													$match: {
														$expr: {
															$and: [
																{
																	$eq: [
																		'$level3',
																		'$$categoryLevel3'
																	]
																},
																{ $eq: ['$level', 4] }
															]
														}
													}
												},
												{
													$project: {
														_id: 1,
														name: 1,
														position: 1,
														level: 1,
														commission: 1,
														thumb: 1
													}
												},
												{
													$sort: { position: 1 }
												}
											],
											as: 'level4'
										}
									},
									{
										$project: {
											_id: 1,
											name: 1,
											position: 1,
											level: 1,
											commission: 1,
											thumb: 1,
											level4: 1
										}
									},
									{
										$sort: { position: 1 }
									}
								],
								as: 'level3'
							}
						},
						{
							$project: {
								_id: 1,
								name: 1,
								position: 1,
								level: 1,
								commission: 1,
								thumb: 1,
								level3: 1
							}
						},

						{
							$sort: { position: 1 }
						}
					],
					as: 'level2'
				}
			},
			{
				$project: {
					_id: 1,
					name: 1,
					position: 1,
					level: 1,
					commission: 1,
					thumb: 1,
					level2: 1
				}
			}
		]);
		for (let l1 of results) {
			const l2s = [];
			for (let l2 of l1.level2) {
				const l3s = [];
				for (let l3 of l2.level3) {
					if (l3.level4.length) {
						l3s.push(l3);
					}
				}
				l2.level3 = l3s;
				if (l2.level3.length) {
					l2s.push(l2);
				}
			}
			l1.level2 = l2s;
		}
		results = results.filter((l1) => l1.level2.length);

		return results;
	} catch (error) {
		throw error;
	}
};

export const getSellerCategory = async (id: any, queryObj: QueryObj) => {
	try {
		let dbQuery: any = { seller: id, level: 2 };
		let dbProject: any = {};

		const results = await getResults(
			queryObj,
			SellerCategory,
			dbQuery,
			dbProject,
			'name',
			'name',
			1,
			15
		);

		return results;
	} catch (error) {
		throwError('404');
	}
};

export const reorderLevel2Categories = async (data: any) => {
	try {
		if (!data.length) {
			throwError(400);
		}
		if (data.length) {
			for (const category of data) {
				if (category?._id && category?.position) {
					await SellerCategory.findByIdAndUpdate(
						category._id,
						{
							$set: {
								position: category.position
							}
						},
						{ useFindAndModify: false }
					).lean();
				}
			}
		}
		return;
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
					category: { $in: categories }
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
									$and: [{ $eq: ['$specification', '$$specification'] }]
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
									$and: [{ $eq: ['$_id', '$$cid'] }]
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

export const getAllVersions = async () => {
	try {
		let versions = await Version.find({});

		if (!versions) {
			throwError(404);
		}
		let customerVersions = versions.filter((version) => version.appName === 'customer-mobile');

		return customerVersions;
	} catch (error) {
		throw error;
	}
};

export const addVersionMetadata = async (version, app, data) => {
	try {
		let item = await Version.findOne({ version: version, appName: app });
		if (!item) {
			throwError(404);
		}

		item.metadata.bannerImages.push(data.bannerData);
		item.markModified('metadata');
		item.save();

		return item;
	} catch (error) {
		throw error;
	}
};

export const editVersionMetadata = async (version, app, data) => {
	try {
		let item = await Version.findOne({ version: version, appName: app });
		if (!item) {
			throwError(404);
		}

		let bannerIndex = item.metadata.bannerImages.findIndex(
			(banner) => banner.uri === data.bannerData.uri
		);
		item.metadata.bannerImages[bannerIndex] = {
			...item.metadata.bannerImages[bannerIndex],
			...data.bannerData
		};

		if (data.edit) {
			item.metadata.bannerImages[bannerIndex].uri = data.edit;
		}

		item.markModified('metadata');
		item.save();
		return item.metadata.bannerImages[bannerIndex];
	} catch (error) {
		throw error;
	}
};

export const getVersionApp = async (version) => {
	try {
		let versions = await Version.find({ version: version }).select('appName');
		if (!versions) {
			throwError(404);
		}
		const appName = [];

		for (let version of versions) {
			if (version.appName) {
				appName.push(version.appName);
			}
		}

		return appName;
	} catch (error) {
		throw error;
	}
};

export const getSelectedVersion = async (version, app) => {
	try {
		let versions = await Version.findOne({ version: version, appName: app }).select(
			'metadata.bannerImages'
		);

		if (!versions) {
			throwError(404);
		}

		return versions;
	} catch (error) {
		throw error;
	}
};

export const getBannerImages = async (version, app) => {
	try {
		let metadata = await Version.findOne({ version: version, appName: app });

		if (!metadata) {
			throwError(404);
		}
		const banners = metadata.metadata.bannerImages;

		return banners;
	} catch (error) {
		throw error;
	}
};
export const setPromotionOfProduct = async (data) => {
	try {
		const { seller, products } = data;
		if (!seller || !products.length) {
			throwError(404);
		}
		// set seller promotion
		const updateSeller = await Seller.updateOne(
			{ _id: seller },
			{
				$set: {
					featured: true
				}
			}
		);

		let updateProduct = await NewProduct.updateMany(
			{ seller: seller, _id: { $in: products } },
			{
				$set: {
					featured: true
				}
			}
		);
	} catch (e) {
		console.error(e);
		throwError(500);
	}
};
export const removePromotionProduct = async (data) => {
	try {
		const { products, seller } = data;
		if (!products.length) {
			throwError(404);
		}

		let updateProduct = await NewProduct.updateMany(
			{ _id: { $in: products } },
			{
				$set: {
					featured: false
				}
			}
		);
		let featureProductsCount = await NewProduct.countDocuments({
			featured: true,
			seller: seller
		});
		if (featureProductsCount == 0) {
			const updateSeller = await Seller.updateOne(
				{ _id: seller },
				{
					$set: {
						featured: false
					}
				}
			);
		}
	} catch (e) {
		console.error(e);
		throwError(500);
	}
};
export const getFeaturedProducts = async (data) => {
	try {
		const { seller } = data;
		let products = await NewProduct.find({ featured: true, seller: seller }).lean();
		return products;
	} catch (e) {
		console.error(e);
		throwError(500);
	}
};

export const updateFeaturedStatus = async (data: any) => {
	try {
		const { status, id } = data;
		if (![true, false].includes(status)) {
			throwError(400);
		}

		let product = await NewProduct.findById({ _id: id });

		if (!product) {
			throwError(404);
		}

		product.featured = status === true ? true : false;
		await product.save();
	} catch (error) {
		throw error;
	}
};
