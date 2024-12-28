import { model, Document, Schema } from 'mongoose';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';

export interface ICategory extends Document, CommonSchemaProps {
	name?: string;
	level?: 1 | 2 | 3 | 4;
	returnPeriod: number;
	image?: string;
	thumb?: string;
	level1?: string | ICategory;
	level2?: string | ICategory;
	level3?: string | ICategory;
	commission?: number;
	insurance?: number;
	position?: number;
	shedulerOff: boolean;
	isRestaurantService?: boolean;
}

export const Category = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		returnPeriod: { type: Number },
		isRestaurantService: { type: Boolean },
		level: { type: Number, default: 1 },
		image: { type: String },
		thumb: { type: String },
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
		commission: Number,
		position: { type: Number, default: 1 },
		insurance: {
			type: Number,
			default: 2
		},
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Category.virtual('level2Count', {
	ref: 'Category',
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

Category.virtual('level3Count', {
	ref: 'Category',
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

Category.virtual('level4Count', {
	ref: 'Category',
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

Category.virtual('specificationCount', {
	ref: 'Specification',
	localField: '_id',
	foreignField: 'category',
	justOne: false,
	count: true,
	options: {
		match: { status: { $ne: 'deleted' } }
	}
});

Category.index(
	{
		name: 1
	},
	{
		name: 'main'
	}
);

Category.index(
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

Category.index(
	{
		level1: 1,
		level: 1
	},
	{
		name: 'level1cats'
	}
);

Category.index(
	{
		level2: 1,
		level: 1
	},
	{
		name: 'level2cats'
	}
);

Category.index(
	{
		level3: 1,
		level: 1
	},
	{
		name: 'level3cats'
	}
);
const CategoryModel = model<ICategory>('Category', Category);

export default CategoryModel;
