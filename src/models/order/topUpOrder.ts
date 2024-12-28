import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ICustomer } from '../customer/customer';
import { IUser } from '../user/user';

export interface ITopUpOrder extends Document, Omit<CommonSchemaProps, 'status'> {
	buyer: string | ICustomer;
	paymentMode: string;
	amount: number;
	status: 'pending' | 'completed' | 'failed';
	onlinePayment?: {
		paymentId: string;
		txnToken: string;
		signature?: string;
		amount: number;
	};
}

const TopUpOrder = new Schema(
	{
		...mongooseSchemaProps,
		buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
		paymentMode: { type: String, enum: ['online', 'cash'], default: 'online' },
		amount: { type: Number, required: true },
		status: {
			type: String,
			enum: ['pending', 'completed', 'failed'],
			default: 'pending'
		},
		onlinePayment: {
			paymentId: String,
			txnToken: String,
			signature: String,
			amount: Number
		},
		createdBy: { type: Schema.Types.ObjectId, refPath: 'createdByModel' },
		createdByModel: {
			type: String,
			enum: ['Customer', 'User']
		}
	},
	{
		...mongooseSchemaOptions
	}
);

const TopUpModel = model<ITopUpOrder>('TopUpOrder', TopUpOrder);
export default TopUpModel;
