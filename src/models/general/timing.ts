import { Schema, model, Document, SchemaTimestampsConfig, ObjectId } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ICategory } from '../category/category';
import { ISeller } from '../customer/seller';

export interface ITiming extends CommonSchemaProps, Document {
	type: 'shop' | 'product&category';
	durationType: 'daily' | 'week';
	startTime: string;
	endTime: string;
	products?: string[];
	fullyEnableDays?: number[];
	fullyDisableDays?: number[];
	shops?: string[];
	categories?: {
		seller: string | ISeller;
		level: number;
		cat_id: string | ICategory;
	}[];
	disable?: boolean;
}

const Timing = new Schema(
	{
		type: { type: String, required: true, enum: ['shop', 'product&category'] },
		durationType: {
			type: String,
			required: true,
			enum: ['daily', 'week']
		},
		startTime: { type: String, required: true },
		endTime: { type: String, required: true },
		products: [{ type: Schema.Types.ObjectId, ref: 'NewProduct' }],
		fullyEnableDays: [Number],
		fullyDisableDays: [Number],
		shops: [String],
		categories: [
			{
				seller: { type: Schema.Types.ObjectId, ref: 'NewCustomer' },
				level: Number,
				cat_id: { type: Schema.Types.ObjectId, ref: 'Category' }
			}
		],
		disable: { type: Boolean, default: false },
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

const TimingModel = model<ITiming>('Timing', Timing);
export default TimingModel;
