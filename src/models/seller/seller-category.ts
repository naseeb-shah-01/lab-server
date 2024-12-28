import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { Category, ICategory } from '../category/category';

export interface ISellerCategory extends Omit<ICategory, 'level1' | 'level2' | 'level3'> {
	globalCatID?: string | ICategory;
	name?: string;
	seller?: string;
	level?: 1 | 2 | 3 | 4;
	level1?: string | ISellerCategory;
	level2?: string | ISellerCategory;
	level3?: string | ISellerCategory;
	image?: string;
	thumb?: string;
	commission?: number;
	insurance?: number;
	position?: number;
	mannualSchedule?: Date;
	scheduleBy?: string;
	isRestaurantService?: boolean;
	insured?: boolean;
	productCount?: number;
}

const SellerCategory = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		globalCatID: {
			type: Schema.Types.ObjectId,
			ref: 'Category'
		},
		seller: {
			type: Schema.Types.ObjectId,
			ref: 'NewCustomer'
		},
		level: { type: Number, default: 1 },
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
		image: { type: String },
		thumb: { type: String },

		commission: {
			type: Number,
			default: 0
		},
		position: { type: Number, default: 1 },
		insurance: {
			type: Number,
			default: 0
		},
		insured: {
			type: Boolean,
			default: false
		},
		productCount: {
			type: Number,
			default: 0
		},
		mannualSchedule: {
			type: Date,
			default: null
		},
		isRestaurantService: {
			type: Boolean,
			default: false
		},
		scheduleBy: String,
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

SellerCategory.virtual('level2Count', {
	ref: 'SellerCategory',
	localField: '_id',
	foreignField: 'level1',
	justOne: false,
	count: true,
	options: {
		match: {
			$and: [
				{
					status: { $ne: 'deleted' }
				},
				{
					level: { $eq: 2 }
				}
			]
		}
	}
});

SellerCategory.virtual('level3Count', {
	ref: 'SellerCategory',
	localField: '_id',
	foreignField: 'level2',
	justOne: false,
	count: true,
	options: {
		match: {
			$and: [
				{
					status: { $ne: 'deleted' }
				},
				{
					level: { $eq: 3 }
				}
			]
		}
	}
});

SellerCategory.virtual('level4Count', {
	ref: 'SellerCategory',
	localField: '_id',
	foreignField: 'level3',
	justOne: false,
	count: true,
	options: {
		match: {
			$and: [
				{
					status: { $ne: 'deleted' }
				},
				{
					level: { $eq: 4 }
				}
			]
		}
	}
});

SellerCategory.virtual('l1ProductCount', {
	ref: 'NewProduct',
	localField: '_id',
	foreignField: 'level1',
	justOne: false,
	count: true
});

SellerCategory.virtual('l2ProductCount', {
	ref: 'NewProduct',
	localField: '_id',
	foreignField: 'level2',
	justOne: false,
	count: true
});

SellerCategory.virtual('l3ProductCount', {
	ref: 'NewProduct',
	localField: '_id',
	foreignField: 'level3',
	justOne: false,
	count: true
});

SellerCategory.virtual('l2Cats', {
	ref: 'SellerCategory',
	localField: '_id',
	foreignField: 'level1',
	justOne: false
});

SellerCategory.virtual('l3Cats', {
	ref: 'SellerCategory',
	localField: '_id',
	foreignField: 'level2',
	justOne: false
});

SellerCategory.index(
	{
		name: 1
	},
	{
		name: 'main'
	}
);

SellerCategory.index(
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

SellerCategory.index(
	{
		level1: 1,
		level: 1
	},
	{
		name: 'level1cats'
	}
);

SellerCategory.index(
	{
		level2: 1,
		level: 1
	},
	{
		name: 'level2cats'
	}
);

SellerCategory.index(
	{
		level3: 1,
		level: 1
	},
	{
		name: 'level3cats'
	}
);

const SellerCategoryModel = model<ISellerCategory>('SellerCategory', SellerCategory);
export default SellerCategoryModel;
