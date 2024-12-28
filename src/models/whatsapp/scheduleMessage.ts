import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';

interface Template {
	name: string;
	language: {
		code: string;
	};
	components: Component[];
}

interface Component {
	type: string;
	parameters?: Parameter[];
	sub_type?: string;
	index?: string;
}

interface Parameter {
	type: string;
	text?: string;
	image?: {
		link: string;
	};
}

type DateRange = {
	startDate: Date;
	endDate: Date;
};

interface FilterQuery {
	filterBy: string;
	dateRange?: DateRange;
	deliveredOrders?: string;
	area?: string;
	foodOrders?: any;
}

export interface IScheduleMessage {
	messaging_product: string;
	recipient_type: string;
	type: string;
	template: Template;
	sentMsgCount: number;
	sendDate?: Date;
	sendStatus: string;
	messageType: string;
	filterCustomer?: FilterQuery;
}

const ParameterSchema = new Schema({
	type: String,
	text: String,
	image: {
		link: String
	}
});

const ComponentSchema = new Schema({
	type: String,
	parameters: [ParameterSchema],
	sub_type: String,
	index: String
});

const TemplateSchema = new Schema({
	name: String,
	language: {
		code: String
	},
	components: [ComponentSchema]
});

const DateRangeSchema = new Schema({
	startDate: Date,
	endDate: Date
});

const FilterQuerySchema = new Schema({
	filterBy: String,
	dateRange: DateRangeSchema,
	deliveredOrders: String,
	area: String,
	foodOrders: Schema.Types.Mixed // replace 'Mixed' with the actual type if known
});

const ScheduleMessageSchema = new Schema(
	{
		...mongooseSchemaProps,
		messaging_product: String,
		recipient_type: String,
		type: String,
		messageType: String,
		testNumber: String,
		sentMsgCount: Number,
		template: TemplateSchema,
		sendDate: Date,
		sendStatus: {
			type: String,
			default: 'pending'
		},
		filterCustomer: FilterQuerySchema
	},
	mongooseSchemaOptions
);

export const Whatsapp_msg_queue = model<IScheduleMessage>(
	'Whatsapp_msg_queue',
	ScheduleMessageSchema
);
