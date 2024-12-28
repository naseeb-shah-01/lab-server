import { model, Document, Schema } from 'mongoose';
import { CommonSchemaProps, mongooseSchemaProps, mongooseSchemaOptions } from '../common-schema-props';

export interface IUser extends Document, CommonSchemaProps {
    contact?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    fcmTokens?: string[];
    sessions?: string[];
    otp?: number;
    sockets?: string[];
}


const User = new Schema({
    contact: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    firstName: String,
    lastName: String,
    sessions: [String],
    fcmTokens: [String],
    otp: { type: Number, default: null },
    sockets: [String],
    ...mongooseSchemaProps
}, {
    ...mongooseSchemaOptions
});

User.index({
    status: 1,
    contact: 1,
    email: 1,
    admin: 1,
}, {
    name: 'main'
});

User.index({
    firstName: 'text',
    lastName: 'text',
}, {
    name: 'search',
    collation: {
        locale: 'simple'
    }
});

const UserModel = model<IUser>('User', User);
export default UserModel;