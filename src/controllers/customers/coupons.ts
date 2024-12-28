import { model, Types } from 'mongoose';
import { ICoupon } from '../../models/customer/coupons';
import { ICustomer } from '../../models/customer/customer';
import { ISeller } from '../../models/customer/seller';
import { throwError } from '../../helpers/throw-errors';

const CouponModel = model<ICoupon>('Coupon');
const Customer = model<ICustomer>('Customer');
const Seller = model<ISeller>('NewCustomer');

// to get all the coupons
export const getCoupons = async (user, reqQuery) => {
	// TODO:Needs to be updated with active status

	let {
		seller,
		shopDelivery,
		platformDelivery = true,
		total = Number.MAX_SAFE_INTEGER
	} = reqQuery;
	seller = Types.ObjectId(seller);

	// Get all coupons that have the seller in their seller array or have an empty seller array
	let coupons = await CouponModel.find({
		$or: [{ seller: seller }, { seller: { $size: 0 } }],
		expiry: { $gte: new Date() },
		$expr: { $gt: ['$maxUseCount', '$globalUseCount'] }
	}).lean();

	let buyerUsedCoupons = (
		await Customer.findOne({ _id: user._id }).select('inelegibleCoupons')
	).inelegibleCoupons.reduce((acc, element) => {
		if (acc[element]) {
			acc[element]++;
		} else {
			acc[element] = 1;
		}
		return acc;
	}, {});

	let availableCoupons = [];

	coupons.forEach((coupon: ICoupon) => {
		let disable = false;
		let disableReason = '';
		if (coupon?.count == buyerUsedCoupons[coupon?._id.toString()]) {
			disable = true;
			disableReason = `This coupon can be applied only ${coupon.count} times per user`;
		}
		if (coupon.minOrder > total) {
			disable = true;
			disableReason = `Add items worth ₹${coupon.minOrder} or more to unlock this coupon`;
		}

		if (!platformDelivery && coupon.type == 'delivery') {
			disable = true;
			disableReason = ' You can use this with Platform Delivery only.';
		}

		let newCoupons = {
			...coupon,
			id: coupon._id,
			disable,
			disableReason
		};

		availableCoupons.push(newCoupons);
	});
	availableCoupons.sort((a, b) => a.disable - b.disable);

	return availableCoupons;
};

// Gets the applied coupon which is currently applied by the user
// used at display cart /cart and placing order /place
export const getCustomerCoupon = async (user) => {
	const res = await Customer.findOne({ _id: user._id });

	return res.appliedCoupon != '' ? await CouponModel.findOne({ _id: res.appliedCoupon }) : {};
};
//{_id:ObjectId('612ca4b57ab02b82;5c3285b3')}
// used internally after placing order to clr current applied coupon and move to ineligible coupons
export const applyCoupon = async (user) => {
	try {
		const buyer = await Customer.findOne({ _id: user });

		const coupon = await CouponModel.findOne({
			_id: buyer.appliedCoupon ? buyer.appliedCoupon : null
		});
		if (buyer.appliedCoupon) {
			buyer.inelegibleCoupons.push(buyer.appliedCoupon);

			buyer.appliedCoupon = null;

			await buyer.save();
		}
		return buyer;
	} catch (e) {
		throwError(502);
	}
};

export const removeCoupon = async (user) => {
	const res = await Customer.findOne({ _id: user._id });
	res.appliedCoupon = '';
	await res.save();
	return res;
};

// to check and apply coupon on UI coupon screen
export const checkValidCoupon = async (id, user, query) => {
	const { totalAmount } = query;
	const res = await Customer.findOne({ _id: user._id }).select('inelegibleCoupons');
	var ineligibleCount = res.inelegibleCoupons.filter((item) => item == id).length;

	let appliedCoupon = await CouponModel.findById(id);
	if (ineligibleCount >= appliedCoupon.count) {
		appliedCoupon = undefined;
		throwError(400, 'This coupon cannot be applied any more times');
	}

	if (appliedCoupon && appliedCoupon.minOrder > totalAmount) {
		appliedCoupon = undefined;
		throwError(400, 'Minimum order amount not met');
	}

	res.appliedCoupon = appliedCoupon?._id || '';
	await res.save();
	return appliedCoupon || {};
};

export const addSelectedSeller = async (id, user) => {
	const res = await Customer.findOne({ _id: user._id });
	res.sellerSelected = id;
	await res.save();
	return;
};

export const addWalletStatus = async (status, user) => {
	const res = await Customer.findOne({ _id: user._id });
	res.walletUsed = status;
	await res.save();
	return;
};
