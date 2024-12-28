import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';

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

export interface IScheduleNotification {
	name: string;
	title: string;
	content: string;
	image: string;
	sentNotificationCount: number;
	sendDate?: Date;
	sendStatus: string;
	sending?: boolean;
	sellerId: string;
	messageType: string;
	filterCustomer?: FilterQuery;
	testNumber?: string;
	testFCM?: string;
}

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

const ScheduleNotificationSchema = new Schema(
	{
		...mongooseSchemaProps,
		name: String,
		title: String,
		content: String,
		image: String,
		messageType: String,
		testNumber: String,
		testFCM: String,
		sentNotificationCount: Number,
		sendDate: Date,
		type: String,
		userType: String,
		sellerId: String,
		sendStatus: {
			type: String,
			default: 'pending'
		},
		sending: { type: Boolean, default: false },
		filterCustomer: FilterQuerySchema
	},
	mongooseSchemaOptions
);

export const fcm_notification_queue = model<IScheduleNotification>(
	'fcm_notification_queue',
	ScheduleNotificationSchema
);
