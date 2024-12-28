import { IUser } from './user/user';
import { Schema } from 'mongoose';

export class CommonSchemaProps {
    createdBy?: string | IUser;
    updatedBy?: string | IUser;
    createdAt?: Date;
    updatedAt?: Date;
    status?: 'active' | 'deleted' | 'inactive';
}

export const mongooseSchemaProps = {
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        default: 'active'
    }
}

export const mongooseSchemaOptions = {
    timestamps: true,
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    },
    collation: {
        locale: 'en_US',
        numericOrdering: true
    }
}