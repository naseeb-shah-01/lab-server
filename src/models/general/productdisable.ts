import { Schema, model, Document, SchemaTimestampsConfig, ObjectId } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';

export interface ITiming extends CommonSchemaProps, Document {
	type: 'shop' | 'product&category';
	durationType: 'daily' | 'week';
	startTime: string;
	endTime: string;
	startDate?: string;
	endDate?: string;
	products?: string[];
	fullyEnableDays?: number[];
	fullyDisableDays?: number[];
	shops?: string[];
	categories?: {
		seller: string;
		level: number;
		cat_id: string;
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

		startDate: { type: String },
		endDate: { type: String },
		products: [{ type: Schema.Types.ObjectId, ref: 'NewProduct' }],
		fullyEnableDays: [Number],
		fullyDisableDays: [Number],
		shops: [String],
		categories: [
			{
				seller: { type: Schema.Types.ObjectId, ref: 'NewCustomer' },
				level: Number,
				cat_id: String
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
