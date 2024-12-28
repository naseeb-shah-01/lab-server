import { model, Document, Schema } from 'mongoose';
import { ICategory } from '../category/category';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';

import { IPoint, Point } from '../locations/geoJson';

const Buyer = new Schema(
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

		addresses: [
			{
				type: Boolean,
				line1: String,
				line2: String,
				state: String,
				city: String,
				pincode: String,
				location: Point
			}
		],

		sessions: { type: [String], default: [] },
		sockets: { type: [String], default: [] },
		fcmTokens: [String],
		otp: { type: Number, default: null },
		email: { type: String, default: null },
		rating: {
			overall: Number,
			seller: Number,
			rider: Number
		},
		couppon: [
			{
				redeem: Boolean,
				expirydate: String,
				name: String,
				amt: Number
			}
		],
		intrests: [String],

		// payment methods and data
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

const BuyerModel = model('Buyer', Buyer);
export default BuyerModel;
