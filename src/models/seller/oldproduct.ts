import { model, Document, Schema } from 'mongoose';
import { ICategory } from '../category/category';
import { ISpecification } from '../category/specification';
import { ISpecificationValue } from '../category/specification-value';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ICustomer } from '../customer/customer';
import { IPrice } from './price';

export interface IVariant {
	_id?: string;
	specifications?: {
		specification?: string | ISpecification;
		value?: string | ISpecificationValue;
	}[];
}

export interface ISet {
	_id?: string;
	price?: number;
	gstValue?: number;
	gstType?: 'inc' | 'exc' | 'none';
	gst?: number;
	minimumOrderQuantity?: number;
	variants?: {
		quantity?: number;
		specifications?: {
			specification?: string | ISpecification;
			value?: string | ISpecificationValue;
		}[];
	}[];
}

export interface IProduct extends Document, CommonSchemaProps {
	name?: string;
	seller?: string | ICustomer;
	level1?: string | ICategory;
	level2?: string | ICategory;
	level3?: string | ICategory;
	level4?: string | ICategory;
	type?: 'set' | 'single';//legacy
	specifications?: {
		specification?: string | ISpecification;
		values?: {
			value?: string | ISpecificationValue;
		}[];
	}[];
	description?: string;
	expiry?: number;//legacy
	expiryUnit?: string;//legacy
	thumbImages?: {
		image?: string;
		thumb?: string;
	}[];
	single?: {
		variants?: IVariant[];//legacy
	};
	minPrice?: Partial<IPrice>;
	sets?: ISet[];//legacy
	prices?: IPrice[];
}

const Variant = new Schema({
	specifications: [
		{
			specification: {
				type: Schema.Types.ObjectId,
				ref: 'Specification'
			},
			value: {
				type: Schema.Types.ObjectId,
				ref: 'SpecificationValue'
			}
		}
	]
});

const Set = new Schema({
	price: {
		type: Number
	},
	gstValue: {
		type: Number
	},
	gstType: {
		type: String
	},
	gst: {
		type: Number
	},
	minimumOrderQuantity: {
		type: Number
	},
	variants: [
		{
			quantity: Number,
			specifications: [
				{
					specification: {
						type: Schema.Types.ObjectId,
						ref: 'Specification'
					},
					value: {
						type: Schema.Types.ObjectId,
						ref: 'SpecificationValue'
					}
				}
			]
		}
	]
});

const Product = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		seller: {
			type: Schema.Types.ObjectId,
			ref: 'Customer'
		},
		level1: {
			type: Schema.Types.ObjectId,
			ref: 'Category'
		},
		level2: {
			type: Schema.Types.ObjectId,
			ref: 'Category'
		},
		level3: {
			type: Schema.Types.ObjectId,
			ref: 'Category'
		},
		level4: {
			type: Schema.Types.ObjectId,
			ref: 'Category'
		},
		type: {
			type: String
		},
		specifications: [
			{
				specification: {
					type: Schema.Types.ObjectId,
					ref: 'Specification'
				},
				values: [
					{
						value: {
							type: Schema.Types.ObjectId,
							ref: 'SpecificationValue'
						}
					}
				]
			}
		],
		description: {
			type: String
		},
		expiry: {
			type: Number
		},
		expiryUnit: {
			type: String
		},
		thumbImages: [
			{
				image: String,
				thumb: String
			}
		],
		single: {
			variants: [Variant]
		},
		minPrice: {
			price: {
				type: Number
			},
			gstValue: {
				type: Number
			},
			gstType: {
				type: String
			},
			gst: {
				type: Number
			},
			minimumOrderQuantity: {
				type: Number
			},
			mainPrice: {
				type: Number
			},
			moqSet: {
				type: Number
			},
			priceSet: {
				type: Number
			},
			purchasePrice: {
				type: Number
			},
			sellingPrice: {
				type: Number
			}
		},
		sets: [Set],
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Product.virtual('prices', {
	ref: 'Price',
	localField: '_id',
	foreignField: 'product',
	justOne: false,
	options: {
		match: { status: { $ne: 'deleted' } },
		sort: { price: 1 }
	}
});

Product.index(
	{
		status: 1,
		seller: 1
	},
	{
		name: 'main'
	}
);

Product.index(
	{
		name: 'text'
	},
	{
		name: 'search',
		collation: {
			locale: 'simple'
		}
	}
);

const ProductModel = model<IProduct>('Product', Product);
export default ProductModel;
