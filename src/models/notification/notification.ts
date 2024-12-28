import { Document, model, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaOptions,
	mongooseSchemaProps
} from '../common-schema-props';

export interface INotification extends Document, CommonSchemaProps {
	userType?: 'admin' | 'buyer' | 'seller' | 'rider';
	message?: string;
	type?: string;
	data?: any;
	user?: string;
	clear?: boolean;
}

const Notification = new Schema(
	{
		userType: { type: String },
		message: { type: String },
		type: { type: String },
		data: { type: Schema.Types.Mixed },
		user: { type: Schema.Types.ObjectId },
		clear: { type: Boolean, default: false },
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

const NotificationModel = model<INotification>('Notification', Notification);
export default NotificationModel;
