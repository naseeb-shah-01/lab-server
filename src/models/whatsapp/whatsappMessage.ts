import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ICustomer } from '../customer/customer';

interface IMessage {
	chat?: string;
	receivedTime?: Date;
}
interface IRemarks {
	issue?: string;
	solution?: string;
	solutionProvidedBy?: string;
	updateTime?: Date;
}

export interface IWhatsapp extends Document, CommonSchemaProps {
	contact?: string; //mobile Number
	name?: string; //name
	customerId?: string | ICustomer;
	message?: IMessage[];
	messageId?: string;
	templateName?: string;
	smsStatus?: string;
	sentTime?: Date;
	deliveredTime?: Date;
	readTime?: Date;
	unread?: boolean;
	openTime?: Date;
	closedTime?: Date;
	open?: boolean;
	pastIssues?: IRemarks[];
	agent?: string;
}

const messageSchema = new Schema<IMessage>({
	chat: String,
	receivedTime: Date,
	reply: String,
	sentTime: Date
});
const remarksSchema = new Schema<IRemarks>({
	issue: String,
	solution: String,
	solutionProvidedBy: String,
	updateTime: Date
});

const whatsappSchema = new Schema<IWhatsapp>(
	{
		...mongooseSchemaProps,
		contact: String,
		name: String,
		customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
		message: [messageSchema],
		pastIssues: [remarksSchema],
		messageId: String,
		templateName: String,
		smsStatus: String,
		sentTime: Date,
		deliveredTime: Date,
		readTime: Date,
		unread: Boolean,
		openTime: Date,
		closedTime: Date,
		open: { type: Boolean, default: false },
		agent: String
	},
	mongooseSchemaOptions
);

whatsappSchema.index(
	{
		customerId: 1,
		contact: 1
	},
	{
		unique: true
	}
);

export const Whatsapp = model<IWhatsapp>('Whatsapp', whatsappSchema);
