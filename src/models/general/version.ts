import { Schema, model, Document } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';

export interface IVersion extends Document, CommonSchemaProps {
	appName?: string;
	version?: string;
	active?: boolean;
	latest?: boolean;
	description?: string;
	metadata?: any;
}

const Version = new Schema(
	{
		appName: String,
		version: String,
		active: {
			type: Boolean,
			default: true
		},
		latest: {
			type: Boolean,
			default: false
		},
		description: String,
		metadata: Schema.Types.Mixed,
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Version.index(
	{
		status: 1,
		active: 1
	},
	{
		name: 'status_active'
	}
);

const VersionModel = model<IVersion>('Version', Version);
export default VersionModel;
