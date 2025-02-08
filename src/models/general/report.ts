import { Schema, model, Document } from 'mongoose';
import {
    CommonSchemaProps,
    mongooseSchemaProps,
    mongooseSchemaOptions
} from '../common-schema-props';

export interface IReport extends Document, CommonSchemaProps {

    patient:string;
    doctor:string;
    lab:string;
    amount :number;
    paid:number;
    mobile:number;
    tests:{
        name: string;
    result:string;
    min: string;
    max: string;
    uom: string;
    group: string;
    note?: string;
    }[]
    
}
const Report = new Schema(
    {
        patient:{
            type:Schema.Types.ObjectId,
            ref:"Patient",
            required:true
        },
        lab:{
            type:Schema.Types.ObjectId,
            ref:"Lab",
            required:true
        },
        doctor:{
             type:Schema.Types.ObjectId,
            ref:"Doctor",
            required:true
        },
        paid:{
            type:Boolean,
            default:false
        },
        amount:{
            type:Number,
            default:0

        },
        mobile:{
            type:Number,
            
            required:true
        },
        note:{
            type:String
        },
        tests:[{
            name: {
                type: String,
                required: true
            },
            min: {
                type: Number
            },
            result:{
                type:Number, required: true
            },
            max: {
                type: Number
            },
           
            uom: {
                type: String,
                required: true
            },
            note: {
                type: String,
                
            }
        }]
       
,
        ...mongooseSchemaProps
    },
    {
        ...mongooseSchemaOptions
    }
);

const ReportModel = model<IReport>('Report',Report);
export default ReportModel;
