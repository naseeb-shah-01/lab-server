import { Schema, model, Document } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
export interface IPenalty extends Document, CommonSchemaProps {
	userType?: string;
	imposedId?: string;
	amount?: number;
	remark?: string;
}
const Penalty = new Schema(
	{
		userType: {
			required: true,
			type: 'string',
			enum: ['seller', 'buyer', 'rider']
		},
		userId: {
			required: true,
			type: Schema.Types.ObjectId
		},
		orderId: {
			required: true,
			type: Schema.Types.ObjectId,
            ref : 'Order'
		},
		amount: {
			type: Number,
			required: true
		},
		remark: {
			type: String
		},
        imposedBy:{
            required: true,
			type: Schema.Types.ObjectId,
            ref : 'User'
        },
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);
const PenaltyModel = model<IPenalty>('Penalty', Penalty);
export default PenaltyModel;
