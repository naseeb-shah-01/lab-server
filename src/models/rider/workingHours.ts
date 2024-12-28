import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { IRider } from './rider';
import { IOrder } from '../order/order';

export interface IAttendance extends Document, CommonSchemaProps {
	workingIntervals?: {
		open?: Number;
		close?: Number;
	}[];
	activeHours?: Number;

	penalty?: {
		remark?: string;
		charges: Number;
		orderId: string | IOrder;
	}[];
	surgeCharges?: number;

	date?: Date;
	riderId?: string | IRider;
	todayEarnings?: Number;
	dailyIncentive?: Number;
	returnEarn?: Number;
	rejctedOrders?: [string];
}

const Attendance = new Schema(
	{
		workingIntervals: [
			{
				open: Number,
				close: Number
			}
		],
		activeHours: {
			type: Number,
			default: 0
		},
		incentives: [
			{
				earnings: Number,
				orderId: {
					type: Schema.Types.ObjectId,
					ref: 'Order'
				}
			}
		],
		penalty: [
			{
				charges: Number,
				orderId: {
					type: Schema.Types.ObjectId,
					ref: 'Order'
				},
				remark: String
			}
		],
		date: {
			type: Date
		},

		riderId: {
			type: Schema.Types.ObjectId,
			ref: 'Rider'
		},
		todayEarnings: {
			type: Number,
			default: 0
		},
		surgeCharges: {
			type: Number,
			default: 0
		},
		dailyIncentive: {
			type: Number,
			default: 0
		},
		returnEarn: {
			type: Number,
			default: 0
		},
		rejctedOrders: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Order'
			}
		],
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Attendance.index({
	date: 1,
	riderId: 1
});

const AttendanceModel = model<IAttendance>('Attendance', Attendance);
export default AttendanceModel;
