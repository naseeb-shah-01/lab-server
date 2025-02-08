import { Schema, model, Document } from 'mongoose';
import {
    CommonSchemaProps,
    mongooseSchemaProps,
    mongooseSchemaOptions
} from '../common-schema-props';

export interface IDoctor extends Document, CommonSchemaProps {
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
   commission:{
    labId:string;
    percent:number;
   }[]
}
const Doctor = new Schema(
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

    commission:[
        {
            labId:{type:Schema.Types.ObjectId,ref:"Lab"},
            percent:Number,
        }
    ],
        ...mongooseSchemaProps
    },
    {
        ...mongooseSchemaOptions
    }
);

const DoctorModal = model<IDoctor>('Doctor', Doctor);
export default DoctorModal;
