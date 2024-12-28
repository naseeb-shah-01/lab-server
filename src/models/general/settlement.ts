import { Schema, model, Document } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
export interface ISettlement extends Document, CommonSchemaProps {
	rider?: string;
	seller?: string;
	amount?: number;
	startDate?: Date;
	endDate?: Date;
	timeBatch?: number;
	paid?: boolean;
	penalties?: number;
	activeHours?: number;
	incentive?: number;
	OrderCount?: number;
	floatingCashAdjustment?: number;
}
const Settlement = new Schema(
	{
		rider: { type: Schema.Types.ObjectId, ref: 'Rider' },
		seller: {
			type: Schema.Types.ObjectId,
			ref: 'NewCustomer'
		},

		amount: {
			type: Number,
			required: true
		},
		endDate: {
			type: Date,
			required: true
		},
		startDate: {
			type: Date,
			required: true
		},
		timeBatch: {
			type: Number,
			required: true
		},
		paid: {
			type: Boolean,
			default: false
		},
		penalties: {
			default: 0,
			type: Number
		},
		activeHours: {
			default: 0,
			type: Number
		},
		incentive: {
			type: Number
		},
		floatingCashAdjustment: {
			type: Number,
			default: 0
		},
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);
Settlement.index({ seller: 1, startDate: 1, rider: 1 }, { unique: true });

const SettlementModel = model<ISettlement>('Settlement', Settlement);
export default SettlementModel;
