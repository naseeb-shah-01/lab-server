import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ISeller } from '../customer/seller';
import { IProduct, ISet, IVariant } from '../seller/product';

export interface IGroupOrder extends Document, CommonSchemaProps {
	seller?: string | ISeller;
	completed?: boolean;
	processed?: boolean;
	startDate?: Date;
	endDate?: Date;
	duration?: number; // hours
	buyers?: number;
	discount?: number; // percentage
	total?: number;
	maxDiscount?: number;
}

const GroupOrder = new Schema(
	{
		seller: { type: Schema.Types.ObjectId, ref: 'NewCustomer' },
		started: { type: Boolean, default: false },
		completed: { type: Boolean, default: false },
		processed: { type: Boolean, default: false },
		startDate: Date,
		endDate: Date,
		duration: Number,
		buyers: Number,
		discount: Number,
		total: { type: Number, default: 0 },
		maxDiscount: Number,
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

GroupOrder.index(
	{
		status: 1,
		seller: 1
	},
	{
		name: 'main'
	}
);

GroupOrder.virtual('orders', {
	ref: 'Order',
	localField: '_id',
	foreignField: 'groupOrder',
	justOne: false,
	match: { 'accepted.status': true }
});

const GroupOrderModel = model<IGroupOrder>('GroupOrder', GroupOrder);
export default GroupOrderModel;
