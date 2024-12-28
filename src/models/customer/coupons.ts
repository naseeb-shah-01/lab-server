import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ISeller } from './seller';

export interface ICoupon extends Document, CommonSchemaProps {
	name?: string;
	expiry: Date;
	type: string;
	count: number;
	description: string;
	conditions?: string[];
	minOrder: number;
	maxDiscount: number;
	cashback: number;
	firstOrder: boolean;
	seller: (string | ISeller)[];
	providedBy: string;
	maxUseCount?: number;
	globalUseCount?: number;
}

const Coupon = new Schema(
	{
		name: String,
		expiry: Date,
		type: String,
		count: Number,
		description: String,
		conditions: [String],
		minOrder: Number,
		cashback: Number,
		maxDiscount: Number,
		seller: {
			type: [
				{
					type: Schema.Types.ObjectId,
					ref: 'NewCustomer'
				}
			],
			default: []
		},
		providedBy: String,
		maxUseCount: {
			type: Number,
			default: 0
		},
		globalUseCount: {
			type: Number,
			default: 0
		},

		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Coupon.index({
	name: 'text'
});

const CouponModel = model<ICoupon>('Coupon', Coupon);
export default CouponModel;
