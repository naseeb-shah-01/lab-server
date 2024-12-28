import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ISeller } from './seller';

export interface ISubscription extends Document, CommonSchemaProps {
	subscriptionType?: 'Premium' | 'Basic';
	calendarType?: 'WEEK' | 'MONTH' | 'QUARTER';
	subscriptionId?: string;
	orderId?: string;
	signature?: string;
	amount?: number;
	discount?: number;
	txnToken?: string;
	trialEndDate?: Date;
	expiryDate?: Date;
	finalAmount: Number;
	date?: Date;
	invoices?: string[];
	invoiceNumber?: number;
	gst?: number;
	seller?: string | ISeller;
}

const Subscription = new Schema(
	{
		subscriptionType: String,
		calendarType: String,
		subscriptionId: String,
		trialEndDate: Date,
		expiryDate: Date,
		orderId: String,
		signature: String,
		discount: Number,
		amount: Number,
		txnToken: String,
		finalAmount: Number,
		invoiceNumber: Number,
		date: Date,
		invoices: [
			{
				type: String,
				trim: true
			}
		],
		gst: Number,
		seller: { type: Schema.Types.ObjectId, ref: 'NewCustomer' },

		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

const subscriptionModel = model<ISubscription>('Subscription', Subscription);
export default subscriptionModel;
