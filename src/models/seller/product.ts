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
import { ISeller } from '../customer/seller';
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
	seller?: string | ISeller;
	level1?: string | ICategory;
	level2?: string | ICategory;
	level3?: string | ICategory;
	level4?: string | ICategory;
	leafCategory?: string | ICategory;
	type?: 'set' | 'single'; //legacy
	specifications?: {
		specification?: string | ISpecification;
		values?: {
			value?: string | ISpecificationValue;
		}[];
	}[];
	description?: string;
	longDescription?: string;
	expiry?: number; //legacy
	expiryUnit?: string; //legacy
	thumbImages?: {
		image?: string;
		thumb?: string;
	}[];
	temporaryDisabled?: boolean;
	disableDuration?: {
		tillDate?: Date;
		tillTime?: Date;
	};
	single?: {
		variants?: IVariant[]; //legacy
	};
	minPrice?: Partial<IPrice>;
	sets?: ISet[]; //legacy
	prices?: IPrice[];
	veg?: boolean;
	currentStock?: number;
	schedulerOff: boolean;
	scheduleTime?: { start: Date; end: Date };

	mannualSchedule?: Date;
	featured?: boolean;
	barcode?: string;
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
		oldProduct: {
			type: Schema.Types.ObjectId,
			ref: 'Product'
		},
		seller: {
			type: Schema.Types.ObjectId,
			ref: 'NewCustomer'
		},

		featured: {
			type: Boolean,
			default: false
		},
		barcode: {
			type: String
		},
		level1: {
			type: Schema.Types.ObjectId,
			ref: 'SellerCategory'
		},
		level2: {
			type: Schema.Types.ObjectId,
			ref: 'SellerCategory'
		},
		level3: {
			type: Schema.Types.ObjectId,
			ref: 'SellerCategory'
		},
		level4: {
			type: Schema.Types.ObjectId,
			ref: 'SellerCategory'
		},
		oldLevel1: {
			type: Schema.Types.ObjectId
		},
		oldLevel2: {
			type: Schema.Types.ObjectId
		},
		oldLevel3: {
			type: Schema.Types.ObjectId
		},
		oldLevel4: {
			type: Schema.Types.ObjectId
		},
		type: {
			type: String
		},
		leafCategory: {
			type: Schema.Types.ObjectId
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
		longDescription: {
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
		temporaryDisabled: {
			type: Boolean
		},
		disableDuration: {
			tillDate: {
				type: Date
			},
			tillTime: {
				type: Date
			}
		},
		single: {
			variants: [Variant]
		},
		gstValue: {
			type: Number
			// required: true
		},
		gstType: {
			type: String,
			enum: ['inc', 'exc', 'none']
			// required: true
		},
		gst: {
			type: Number
			// required: true
		},

		discount: {
			type: Number
		},
		discountType: {
			type: String,
			enum: ['percentage', 'amount']
		},
		discountStart: {
			type: Date
		},
		discountEnd: {
			type: Date
		},
		currentStock: {
			type: Number
			// required: true
		},
		veg: {
			type: Boolean
			// required: true
		},
		rating: {
			overall: Number,
			seller: Number,
			rider: Number
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

			mainPrice: {
				type: Number
			},
			moqSet: {
				type: Number
			},
			priceSet: {
				type: Number
			},

			sellingPrice: {
				type: Number
			}
		},
		scheduleBy: {
			type: String,
			default: 'none'
		},
		mannualSchedule: {
			type: Date,
			default: null
		},
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

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

Product.index(
	{
		level3: 1,
		level4: 1
	},
	{
		name: 'category'
	}
);

const NewProductModel = model<IProduct>('NewProduct', Product);
export default NewProductModel;
