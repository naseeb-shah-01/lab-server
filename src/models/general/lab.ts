import { Schema, model, Document } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';

export interface ILab extends Document, CommonSchemaProps {
	labName: string;
	mobile: string;
	email: string;
	address: {
		line: string;
		line2: string;
		city: string;
		state: string;
		pin: number;
	};
	tAndC: string;
	notes: string;
	ownerName: string;
	ownerMobile: string;
	employees: [
		{
			id: string;
			role: string;
		}
	];
}
const Lab = new Schema(
	{
		labName: {
			type: String,
            require:true
			
		},
		mobile: {
			type: String,
			required: true
		},
		email: {
			type: String,
			required: true
		},


        address:{
            line:{
                type:String,
                required:true

            },
            line2:{
                type:String,
                

            },
            city:{
                type:String,
                required:true

            },
            state:{
                type:String,
                required:true

            },
            pin:{
                type:String,
                required:true

            },
          
        }
		,
		notes: {
			type: String
		},
        tAndC: {
			type: String
		},ownerName: {
			type: String
		},
        ownerMobile: {
			type: String
		},
        employees: [
            {
                id: {
                    type: Schema.Types.ObjectId,
                },
                role: {
                    type: String
                }
            }
        ],
	
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

const LabModal = model<ILab>('Lab', Lab);
export default LabModal;
