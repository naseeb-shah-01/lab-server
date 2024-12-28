import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { IPoint, Point } from '../locations/geoJson';
import { IOrder } from '../order/order';
import { ISeller } from '../customer/seller';
export interface IRider extends Document, CommonSchemaProps {
	contact?: string;
	name?: string; ////////Profile
	avatar?: string;
	tshirtSize?: string;
	kyc?: boolean;
	kycStage?: string;
	approved?: boolean;
	available?: boolean; ////status
	kycDocument?: any;
	floatingCash?: Number;
	codBlock?: Date;
	addresses?: {
		primary?: boolean;
		line1?: string;
		line2?: string;
		state?: string;
		city?: string;
		pincode?: string;
	}[];
	latestLocation?: IPoint;
	latestLocationTime?: Date;
	activeOrders?: (string | IOrder)[];
	fcmTokens?: string[];
	sessions?: string[];
	sockets?: string[];
	otp?: number;
	email?: string;
	sellerApproved?: boolean;
	bankDetails?: {
		accountNumber?: string;
		ifsc?: string;
		imps?: boolean;
	};
	beneficiaryCreated?: boolean;
	panCardDetails?: {
		panCardNumber?: string;
		panCardImage?: string;
	};
	drivingLicenseDetails?: {
		drivingLicenseNumber?: string;
		drivingLicenseImage?: string;
	};
	seller?: string | ISeller;
	rating?: {
		overAll?: number;
		buyerCount?: number;
		sellerCount?: number;
	};
}

const Rider = new Schema(
	{
		contact: {
			type: String,
			required: true,
			trim: true
		},
		beneficiaryCreated: {
			type: Boolean,
			default: false
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
		codBlock: {
			type: Date,
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
		latestLocationTime: {
			type: Date,
			default: null
		},
		sessions: { type: [String], default: [] },
		sockets: { type: [String], default: [] },
		fcmTokens: [String],
		otp: { type: Number, default: null },
		email: { type: String, default: null },
		sellerApproved: { type: Boolean, default: false },
		bankDetails: {
			accountNumber: String,
			ifsc: String,
			imps: {
				type: Boolean,
				default: false
			}
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
			overAll: { type: Number, default: 0 },
			buyerCount: { type: Number, default: 0 },
			sellerCount: { type: Number, default: 0 }
		},
		seller: {
			type: Schema.Types.ObjectId,
			ref: 'Seller'
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
