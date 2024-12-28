import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ICustomer } from '../customer/customer';
import { IProduct, ISet, IVariant } from '../seller/product';
import { ICoupon } from './coupons';
import { ISeller } from './seller';

export interface ICart extends Document, CommonSchemaProps {
	buyer?: string | ICustomer;
	seller?: string | ISeller;
	product?: string | IProduct;
	itemType: 'set' | 'single';
	itemSet?: string | ISet;
	quantity?: number;
	coupon?: ICoupon;
}

const Cart = new Schema(
	{
		buyer: { type: Schema.Types.ObjectId, ref: 'Customer' },
		seller: { type: Schema.Types.ObjectId, ref: 'NewCustomer' },
		product: { type: Schema.Types.ObjectId, ref: 'newproducts' },
		coupon: { type: Schema.Types.ObjectId, ref: 'Coupons' },
		itemType: String,
		itemSet: Schema.Types.ObjectId,
		quantity: Number,
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Cart.index(
	{
		status: 1,
		buyer: 1,
		seller: 1,
		product: 1,
		coupons: 1
	},
	{
		name: 'main'
	}
);

const CartModel = model<ICart>('Cart', Cart);
export default CartModel;
