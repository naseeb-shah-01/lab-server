import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ICustomer } from '../customer/customer';
import { IGroupOrder } from '../order/group-order';
import { IProduct } from '../seller/product';
import { ISeller } from './seller';

export interface IWishlist extends Document, CommonSchemaProps {
	buyer?: string | ICustomer;
	type?: 'group-order' | 'product' | 'seller';
	groupOrder?: string | IGroupOrder;
	product?: string | IProduct;
	seller?: string | ISeller;
}

const Wishlist = new Schema(
	{
		buyer: { type: Schema.Types.ObjectId, ref: 'Customer' },
		type: { type: String },
		groupOrder: { type: Schema.Types.ObjectId, ref: 'GroupOrder' },
		product: { type: Schema.Types.ObjectId, ref: 'Product' },
		seller: { type: Schema.Types.ObjectId, ref: 'NewCustomer' },
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Wishlist.index(
	{
		status: 1,
		buyer: 1
	},
	{
		name: 'main'
	}
);

const WishlistModel = model<IWishlist>('Wishlist', Wishlist);
export default WishlistModel;
