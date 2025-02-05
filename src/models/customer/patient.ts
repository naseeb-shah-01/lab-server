import { model, Document, Schema } from 'mongoose';
import { ICategory } from '../category/category';
import {
    CommonSchemaProps,
    mongooseSchemaProps,
    mongooseSchemaOptions
} from '../common-schema-props';

import { IPoint, Point } from '../locations/geoJson';
import { Types } from "mongoose";

interface Address {
    line1?: string;
    line2?: string;
    state?: string;
    city?: string;
    pincode?: string;
    location?: Point;
}

interface Point {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
}

export interface IPatient {
    _id?: Types.ObjectId;
    contact: string;
    name?: string;
    avatar?: string | null;
    addresses?: Address[];
    sessions?: string[];
    sockets?: string[];
    fcmTokens?: string[];
    otp?: number | null;
    email?: string | null;
}


const Patient = new Schema(
    {
        contact: {
            type: String,
            required: true,
            trim: true
        },

        name: {
            type: String,
            trim: true
        },

        avatar: {
            type: String,
            default: null
        },

        addresses: [
            {
                type: Boolean,
                line1: String,
                line2: String,
                state: String,
                city: String,
                pincode: String,
                location: Point
            }
        ],

        sessions: { type: [String], default: [] },
        sockets: { type: [String], default: [] },
        fcmTokens: [String],
        otp: { type: Number, default: null },
        email: { type: String, default: null },
      

        // payment methods and data
        ...mongooseSchemaProps
    },
    {
        ...mongooseSchemaOptions
    }
);

const PatientModel = model<IPatient>('Patient', Patient);
export default PatientModel;
