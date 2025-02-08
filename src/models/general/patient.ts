import { Schema, model, Document } from 'mongoose';
import {
    CommonSchemaProps,
    mongooseSchemaProps,
    mongooseSchemaOptions
} from '../common-schema-props';


export interface IPatient extends Document, CommonSchemaProps {
    name: string;
    mobile: string;
    email: string;
    address: {
        line: string;
        line2: string;
        city: string;
        state: string;
        pin: number;
    };
   age:number,
   gender:string;
}
const Patient = new Schema(
    {
        name: {
            type: String,
            require:true
            
        },
        mobile: {
            type: String,
            required: true
        },
        email: {
            type: String,
            
        },
        age: {
            type: Number,
            required:true
        },
        gender: {
            type: String,
            required:true
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
  
        ...mongooseSchemaProps
    },
    {
        ...mongooseSchemaOptions
    }
);

const PatientModal = model<IPatient>('Patient', Patient);
export default PatientModal;
