import { model } from 'mongoose';
import { ICoupon } from '../../models/customer/coupons';
import { ISeller } from '../../models/customer/seller';
import { throwError } from '../../helpers/throw-errors';
import { IOrder } from '../../models/order/order';
import { getResults } from '../../helpers/query';
import { QueryObj } from '../../middlewares/query';

const Seller = model<ISeller>('NewCustomer');
const Coupon = model<ICoupon>('Coupon');
const Order = model<IOrder>('Order');

export const getAllCoupons = async (queryObj: QueryObj, user: any) => {
	try {
		if (!user._id) {
			throwError(401);
		}

		const dbQuery: any = {};

		const dbProject: any = {};
		let result = getResults(queryObj, Coupon, dbQuery, dbProject, 'name', 'name', 1, 15, [
			'seller'
		]);

		return result;
	} catch (e) {
		throw e;
	}
};

export const createCoupon = async (data, user) => {
	try {
		let {
			name,
			expiry,
			type,
			count,
			description,
			minOrder,
			maxDiscount,
			cashback,
			seller,
			maxUseCount
		} = data;
		if (
			!name ||
			!expiry ||
			!type ||
			!count ||
			!description ||
			!minOrder ||
			!maxDiscount ||
			!seller ||
			!maxUseCount
		) {
			throwError(400);
		}
		if (!user._id) {
			throwError(401);
		}
		let result = await new Coupon(data).save();

		return result;
	} catch (e) {
		throw e;
	}
};

export const getASellerCoupons = async (sellerId, user) => {
	try {
		if (user._id) {
			throwError(401);
		}
		let coupons = await Coupon.find({ seller: sellerId });

		return coupons;
	} catch (e) {
		throwError(e);
	}
};

export const removeSellerFromCoupons = async (couponId, sellerId, user) => {
	try {
		if (user._id) {
			throwError(401);
		}
		let removeSeller = await Coupon.updateOne(
			{ _id: couponId },
			{
				$pull: {
					seller: sellerId
				}
			}
		);
		return removeSeller;
	} catch (e) {
		throwError(e);
	}
};

export const deleteCoupon = async (couponId, user) => {
	try {
		if (user._id) {
			throwError(401);
		}
		let deleteCoupon = await Coupon.deleteOne({ _id: couponId });

		return {};
	} catch (e) {}
};
export const editCoupon = async (data, user) => {
	try {
		if (!user._id) {
			throwError(401);
		}
		let editCouponById = await Coupon.findOneAndUpdate(
			{ _id: data.id },
			{ $set: data },
			{ new: true }
		);

		return editCouponById;
	} catch (e) {
		console.error(e);
	}
};
export const getCouponById = async (couponId, user) => {
	try {
		if (!user._id) {
			throwError(401);
		}
		let coupon = await Coupon.findOne({ _id: couponId });
		return coupon;
	} catch (e) {
		throwError(500);
	}
};

export const updateCouponStatus = async (id, status, user) => {
	try {
		if (!user._id) {
			throwError(405);
		}

		let updateCoupon = await Coupon.updateOne(
			{
				_id: id
			},
			{
				$set: {
					status: status
				}
			}
		);

		return;
	} catch (err) {
		console.error(err);
	}
};
