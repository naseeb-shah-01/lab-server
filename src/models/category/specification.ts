import { model, Document, Schema } from 'mongoose';
import { CommonSchemaProps, mongooseSchemaProps, mongooseSchemaOptions } from '../common-schema-props';
import { ICategory } from './category';

export interface ISpecification extends Document, CommonSchemaProps {
    name?: string;
    category?: string | ICategory;
    position?: number;
}

const Specification = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category'
    },
    position: { type: Number, default: 1 },
    ...mongooseSchemaProps
}, {
    ...mongooseSchemaOptions
});

Specification.virtual('values', {
    ref: 'SpecificationValue',
    localField: '_id',
    foreignField: 'specification',
    justOne: false,
    count: true,
    options: {
        match: {
            status: { $ne: 'deleted' }
        }
    }
});

Specification.index({
    name: 1
}, {
    name: 'main'
});

Specification.index({
    category: 1
}, {
    name: 'catregory'
});

Specification.index({
    name: 'text'
}, {
    name: 'search',
    collation: {
        locale: 'simple'
    }
});

const SpecificationModel = model<ISpecification>('Specification', Specification);
export default SpecificationModel;