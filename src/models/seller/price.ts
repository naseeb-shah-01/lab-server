import { model, Document, Schema } from 'mongoose';
import { ICategory } from '../category/category';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ICustomer } from '../customer/customer';
import { IProduct, ISet, IVariant } from './product';
import { IUser } from '../user/user';

export interface IPrice extends Document, CommonSchemaProps {
	_id: string;
	product: string | IProduct;
	seller: string | ICustomer; //sellername
	price: number; //mrp price
	sellingPrice: number; //sellingPrice
	mainPrice: number;
	gstValue: number;
	gstType: 'inc' | 'exc' | 'none';
	gst: number;
	minimumOrderQuantity: number;
	purchasePrice?: number;
	discount?: number;
	discountType?: 'percentage' | 'amount';
	discountStart?: Date;
	discountEnd?: Date;
	currentStock: number;
}

const Price = new Schema(
	{
		_id: {
			type: String
		},
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true
		},
		seller: {
			type: Schema.Types.ObjectId,
			ref: 'Customer',
			required: true
		},
		price: {
			type: Number,
			required: true
		},
		sellingPrice: {
			type: Number,
			required: true
		},
		mainPrice: {
			type: Number,
			required: true
		},
		gstValue: {
			type: Number,
			required: true
		},
		gstType: {
			type: String,
			enum: ['inc', 'exc', 'none'],
			required: true
		},
		gst: {
			type: Number,
			required: true
		},
		minimumOrderQuantity: {
			type: Number,
			required: true
		},
		purchasePrice: {
			type: Number
		},
		discount: {
			type: Number
		},
		discountType: {
			type: String,
			enum: ['percentage', 'amount']
		},
		discountStart: {
			type: Date
		},
		discountEnd: {
			type: Date
		},
		currentStock: {
			type: Number,
			required: true
		},
		temporaryDisabled: {
			type: Boolean
		},
		disableDuration: {
			tillDate: {
				type: Date
			},
			tillTime: {
				type: Date
			}
		},
		shopTiming: {
			sunday: [
				{
					startTime: Date,
					endTime: Date
				}
			],
			monday: [
				{
					startTime: Date,
					endTime: Date
				}
			],
			tuesday: [
				{
					startTime: Date,
					endTime: Date
				}
			],
			wednesday: [
				{
					startTime: Date,
					endTime: Date
				}
			],
			thursday: [
				{
					startTime: Date,
					endTime: Date
				}
			],
			friday: [
				{
					startTime: Date,
					endTime: Date
				}
			],
			saturday: [
				{
					startTime: Date,
					endTime: Date
				}
			]
		},
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Price.index(
	{
		status: 1,
		seller: 1,
		product: 1
	},
	{
		name: 'main'
	}
);

const PriceModel = model<IPrice>('Price', Price);
export default PriceModel;
