import { Schema, model, Document } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
export interface IHistory extends Document, CommonSchemaProps {
	buyer?: string;
	type?: string;
	amount?: number;
	action?: string;
	remark?: string;
	date?: Date;
}
const History = new Schema(
	{
		buyer: {
			type: Schema.Types.ObjectId,
			ref: 'Customer'
		},
		type: {
			type: String,
			required: true
		},
		amount: {
			type: Number,
			required: true
		},
		action: {
			type: String,
			required: true
		},
		remark: {
			type: String
		},
		date: {
			type: Date,
			required: true
		},

		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

const HistoryModel = model<IHistory>('History', History);
export default HistoryModel;
