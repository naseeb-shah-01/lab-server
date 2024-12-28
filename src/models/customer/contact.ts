import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ICustomer } from './customer';

export interface IContact extends Document, CommonSchemaProps {
	sellers?: (string | ICustomer)[];
	backTitle?: string;
	company?: string;
	emailAddresses?: {
		label?: string;
		email?: string;
	}[];
	familyName?: string;
	givenName?: string;
	middleName?: string;
	jobTitle?: string;
	phoneNumbers?: {
		label?: string;
		number?: number;
	}[];
	hasThumbnail?: boolean;
	thumbnailPath?: string;
	postalAddresses?: {
		label?: string;
		formattedAddress?: string;
		street?: string;
		pobox?: string;
		neighborhood?: string;
		city?: string;
		region?: string;
		state?: string;
		postCode?: string;
		country?: string;
	}[];
	prefix?: string;
	suffix?: string;
	department?: string;
	birthday?: { year?: Number; month?: Number; day?: Number };
	imAddresses?: [
		{ username?: string; service?: string },
		{ username?: string; service?: string }
	];
}

const Contact = new Schema(
	{
		sellers: [{ type: String }],
		backTitle: { type: String },
		company: { type: String },
		emailAddresses: [
			{
				label: { type: String },
				email: { type: String }
			}
		],
		familyName: { type: String },
		givenName: { type: String },
		middleName: { type: String },
		jobTitle: { type: String },
		phoneNumbers: {
			type: [
				{
					label: { type: String },
					number: { type: Number }
				}
			],
			required: true
		},
		hasThumbnail: { type: Boolean },
		thumbnailPath: { type: String },
		postalAddresses: [
			{
				label: { type: String },
				formattedAddress: { type: String },
				street: { type: String },
				pobox: { type: String },
				neighborhood: { type: String },
				city: { type: String },
				region: { type: String },
				state: { type: String },
				postCode: { type: String },
				country: { type: String }
			}
		],
		prefix: { type: String },
		suffix: { type: String },
		department: { type: String },
		birthday: { year: Number, month: Number, day: Number },
		imAddresses: [
			{ username: { type: String }, service: { type: String } },
			{ username: { type: String }, service: { type: String } }
		],

		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

const ContactModel = model<IContact>('Contact', Contact);
export default ContactModel;
