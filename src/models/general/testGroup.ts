import { Schema, model, Document } from 'mongoose';
import {
    CommonSchemaProps,
    mongooseSchemaProps,
    mongooseSchemaOptions
} from '../common-schema-props';
import { max, min } from 'date-fns';
export interface IGroup extends Document, CommonSchemaProps {
    name: string;
    type: string;
   note?:string;
    
}
const TestGroup = new Schema(
    {
        type: {
            type: String,
            required: true
        },
        name: {
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

const TestModal = model<IGroup>("Group", TestGroup);
export default TestModal;
