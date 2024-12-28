import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { IPoint, Point } from '../locations/geoJson';
import { IOrder } from '../order/order';

export interface IRider extends Document, CommonSchemaProps {
	contact?: string;
	name?: string;
	avatar?: string;
	tshirtSize?: string;
	kyc?: boolean;
	kycStage?: string;
	approved?: boolean;
	available?: boolean;
	kycDocument?: any;
	floatingCash?: Number;
	addresses?: {
		primary?: boolean;
		line1?: string;
		line2?: string;
		state?: string;
		city?: string;
		pincode?: string;
	}[];
	latestLocation?: IPoint;
	activeOrders?: (string | IOrder)[];
	fcmTokens?: string[];
	sessions?: string[];
	sockets?: string[];
	otp?: number;
	email?: string;
	bankDetails?: {
		accountNumber?: string;
		ifsc?: string;
	};
	panCardDetails?: {
		panCardNumber?: string;
		panCardImage?: string;
	};
	drivingLicenseDetails?: {
		drivingLicenseNumber?: string;
		drivingLicenseImage?: string;
	};
}

const Rider = new Schema(
	{
		contact: {
			type: String,
			required: true,
			trim: true
		},
		name: {
			type: String,
			trim: true
		},
		avatar: {
			type: String,
			default: null
		},
		kyc: {
			type: Boolean,
			default: false
		},
		kycStage: {
			type: String,
			default: null
		},
		approved: {
			type: Boolean,
			default: false
		},
		available: {
			type: Boolean,
			default: false
		},
		kycDocument: {
			type: Schema.Types.Mixed
		},
		floatingCash: {
			type: Schema.Types.Number,
			default: 0
		},
		addresses: [
			{
				primary: Boolean,
				line1: String,
				line2: String,
				state: String,
				city: String,
				pincode: String
			}
		],
		activeOrders: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Order'
			}
		],
		latestLocation: Point,
		sessions: { type: [String], default: [] },
		sockets: { type: [String], default: [] },
		fcmTokens: [String],
		otp: { type: Number, default: null },
		email: { type: String, default: null },
		bankDetails: {
			accountNumber: String,
			ifsc: String
		},
		panCardDetails: {
			panCardNumber: String,
			panCardImage: String
		},
		drivingLicenseDetails: {
			drivingLicenseNumber: String,
			drivingLicenseImage: String
		},
		rating: {
			overAll: Number,
			buyerCount: Number,
			sellerCount: Number
		},

		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Rider.index(
	{
		status: 1,
		contact: 1
	},
	{
		name: 'main'
	}
);

Rider.index(
	{
		contact: 'text',
		name: 'text'
	},
	{
		name: 'search',
		collation: {
			locale: 'simple'
		}
	}
);

Rider.index({
	latestLocation: '2dsphere'
});

const RiderModel = model<IRider>('Rider', Rider);
export default RiderModel;
