import { model } from 'mongoose';
import { deletePrivateProps } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { ICustomer } from '../../models/customer/customer';

import { IWishlist } from '../../models/customer/wishlist';
import { IOrder } from '../../models/order/order';
import { IProduct } from '../../models/seller/product';
import { setCustomerType } from './customer';
import { ISeller } from '../../models/customer/seller';

const Customer = model<ICustomer>('Customer');
const Wishlist = model<IWishlist>('Wishlist');
const Seller = model<ISeller>('NewCustomer');
const NewProduct = model<IProduct>('NewProduct');

export const getWishlist = async (user) => {
	try {
		const customer = await Customer.findById(user?._id);
		if (!customer) {
			throwError(404);
		}
		const wishlistItems = await Wishlist.find({
			status: 'active',
			buyer: user._id
		})
			.populate('product', 'name type minPrice thumbImages')
			.populate({
				path: 'groupOrder',
				populate: [
					{
						path: 'seller',
						select: 'businessName priceTable'
					},
					{
						path: 'orders',
						select: 'items.product',
						populate: {
							path: 'items.product',
							select: 'name thumbImages minPrice type'
						}
					}
				]
			})
			.populate('seller', 'name businessName avatar shopPhotos')
			.lean();

		for (let wItem of wishlistItems) {
			if (wItem.type === 'group-order') {
				const products = {};
				for (let order of (wItem.groupOrder as any).orders as IOrder[]) {
					for (let item of order.items) {
						if (!products[(item.product as IProduct)._id.toString()]) {
							products[(item.product as IProduct)._id.toString()] = item.product;
						}
					}
				}
				delete (wItem as any).groupOrder.orders;
				(wItem.groupOrder as any).products = Object.values(products);
			}
		}

		return wishlistItems || [];
	} catch (error) {
		throw error;
	}
};

export const addWishlistItem = async (data: IWishlist, user) => {
	try {
		if (
			!data ||
			!['group-order', 'product', 'seller'].includes(data.type) ||
			(data.type === 'group-order' && !data.groupOrder) ||
			(data.type === 'product' && !data.product) ||
			(data.type === 'seller' && !data.seller)
		) {
			throwError(400);
		}
		deletePrivateProps(data);
		data.buyer = user._id;
		const existing = await Wishlist.findOne({
			status: 'active',
			buyer: user._id,
			type: data.type,
			...(data.type === 'product'
				? { product: data.product }
				: data.type === 'group-order'
				? { groupOrder: data.groupOrder }
				: { seller: data.seller })
		});
		if (existing) {
			return existing;
		}
		const item = new Wishlist(data);
		await item.save();
		setCustomerType(user._id, 'buyer');
		return item;
	} catch (error) {
		throw error;
	}
};

export const removeWishlistItem = async (id: string) => {
	try {
		const wishlistItem = await Wishlist.findById(id);
		if (!wishlistItem) {
			return null;
		}
		await wishlistItem.delete();
		return wishlistItem;
	} catch (error) {
		throw error;
	}
};
