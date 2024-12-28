import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';

export interface IReferralCode extends Document, CommonSchemaProps {
	code?: string;
	discountPercentage?: number;
	usedBy?: string[];
	seller: string;
}

const ReferralCode = new Schema(
	{
		code: {
			type: String
		},
		discountPercentage: {
			type: Number
		},
		usedBy: {
			type: [String],
			default: []
		},
		seller: { type: String },
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

const ReferralCodeModel = model<IReferralCode>('ReferralCode', ReferralCode);
export default ReferralCodeModel;
