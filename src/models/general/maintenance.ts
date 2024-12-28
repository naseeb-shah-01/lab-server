import { Schema, model, Document, SchemaTimestampsConfig } from 'mongoose';
import { CommonSchemaProps, mongooseSchemaProps, mongooseSchemaOptions } from '../common-schema-props';

export interface IMaintenance extends Document, CommonSchemaProps {
    appName?: string;
    maintenance?: boolean;
}

const Maintenance = new Schema({
    appName: String,
    maintenance: {
        type: Boolean,
        default: false
    },
    ...mongooseSchemaProps
}, {
    ...mongooseSchemaOptions
});


const MaintenanceModel = model<IMaintenance>('Maintenance', Maintenance);
export default MaintenanceModel;