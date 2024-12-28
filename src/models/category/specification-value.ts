import { model, Document, Schema } from 'mongoose';
import { CommonSchemaProps, mongooseSchemaProps, mongooseSchemaOptions } from '../common-schema-props';
import { ICategory } from './category';
import { ISpecification } from './specification';

export interface ISpecificationValue extends Document, CommonSchemaProps {
    name?: string;
    category?: string | ICategory;
    specification?: string | ISpecification
    position?: number;
}

const SpecificationValue = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        text: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category'
    },
    specification: {
        type: Schema.Types.ObjectId,
        ref: 'Specification'
    },
    position: { type: Number, default: 1 },
    ...mongooseSchemaProps
}, {
    ...mongooseSchemaOptions
});

SpecificationValue.index({
    name: 1
}, {
    name: 'main'
});

SpecificationValue.index({
    specification: 1,
}, {
    name: 'specification'
});

SpecificationValue.index({
    name: 'text'
}, {
    name: 'search',
    collation: {
        locale: 'simple'
    }
});

const SpecificationValueModel = model<ISpecificationValue>('SpecificationValue', SpecificationValue);
export default SpecificationValueModel;