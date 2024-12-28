import { Schema, model, Document } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';

export interface ILocation extends CommonSchemaProps, Document {
	address: string;
	city: string;
	state: string;
	zip: string;
	country: string;
	latitude: number;
	longitude: number;
}

const Location = new Schema(
	{
		address: String,
		city: String,
		state: String,
		zip: String,
		country: String,
		latitude: Number,
		longitude: Number,
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Location.index(
	{
		status: 1
	},
	{
		name: 'status'
	}
);

const LocationModel = model<ILocation>('Location', Location);
export default LocationModel;
