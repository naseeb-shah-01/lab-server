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
}
const Test = new Schema(
    {
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
        date: {
            type: Date,
            required: true
        },
        uom: {
            type: String,
            required: true
        },
        note: {
            type: String,
            
        },

        ...mongooseSchemaProps
    },
    {
        ...mongooseSchemaOptions
    }
);

const TestModal = model<ITest>('Test', Test);
export default TestModal;
