import { Schema, model, Document } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';


export interface ITest extends Document, CommonSchemaProps {
	name: string;
	type: string;
	min: string;
	max: string;
	uom: string;
	group: string;
	note?: string;
    ranges?:{
        group:string,
        min:number,
        max:number
    }[]
}
const Test = new Schema(
	{
		group: {
			type: Schema.Types.ObjectId,
			ref: 'Group'
		},
		type: {
			type: String,
			required: true
		},
		name: {
			type: String,
			required: true
		},
		min: {
			type: Number
		},
		max: {
			type: Number
		},

		uom: {
			type: String,
			required: true
		},
		note: {
			type: String
		},
        ranges: [
            {
                group: { type: String, required: true },
                min: { type: Number, required: true },
                max: { type: Number, required: true }
            }
        ],
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

const TestModal = model<ITest>('Test', Test);
export default TestModal;
