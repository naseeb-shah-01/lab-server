import { model, Types } from 'mongoose';
import { deletePrivateProps } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { ICart } from '../../models/customer/cart';
import { ICustomer } from '../../models/customer/customer';
import { ISeller } from '../../models/customer/seller';
import { IOrder } from '../../models/order/order';
import { IPrice } from '../../models/seller/price';
import { IProduct } from '../../models/seller/product';
import newProductModel from '../../models/seller/product';
import { getCustomerCoupon } from './coupons';
import { setCustomerType } from './customer';
const Cart = model<ICart>('Cart');
const Customer = model<ICustomer>('Customer');
const Price = model<IPrice>('Price');
const ObjectId = Types.ObjectId;
const Order = model<IOrder>('Order');
const Seller = model<ISeller>('NewCustomer');
const NewProduct = model<IProduct>('NewProduct');

export const getReferralData = async (id, user) => {
	let customer = await Customer.findOne({ _id: id }, { referral: 1 });
	let listOfReferencedCustomer = await Customer.find({
		'referral.usedcode': customer.referral.mycode
	});
};
export const getUserReferalCode = async (user) => {
	try {
		let customer = await Customer.findOne({ _id: user._id }, { referral: 1 });

		return customer;
	} catch (e) {
		throwError(e);
	}
};
