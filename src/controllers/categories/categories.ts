import { QueryObj } from '../../middlewares/query';
import { Types, model } from 'mongoose';
import { Request, Response } from 'express';
import CategoryModel, { ICategory } from '../../models/category/category';
import { ISpecification } from '../../models/category/specification';
import { ISpecificationValue } from '../../models/category/specification-value';
import { getResults, deletePrivateProps } from '../../helpers/query';
import { createThumbWithBuffer } from '../../helpers/thumb';
import { throwError } from '../../helpers/throw-errors';
import { ISeller } from '../../models/customer/seller';
import { ISellerCategory } from '../../models/seller/seller-category';

const ObjectId = Types.ObjectId;
const Category = model<ICategory>('Category');
const SellerCategory = model<ISellerCategory>('SellerCategory');
const Specification = model<ISpecification>('Specification');
const SpecificationValue = model<ISpecificationValue>('SpecificationValue');
const levels = [1, 2, 3, 4];
const Seller = model<ISeller>('NewCustomer');
export const getCategoriesByLevel = async (level: string, queryObj: QueryObj) => {
	try {
		const levelVal = parseInt(level);
		if (!queryObj || !levelVal || isNaN(levelVal) || !levels.includes(levelVal)) {
			throwError(400);
		}

		const dbQuery: any = {
			level: levelVal,
			status: { $ne: 'deleted' }
		};

		const dbProject: any = {
			name: 1,
			thumb: 1,
			status: 1,
			level: 1,
			commission: 1,
			position: 1
		};

		const populations = [`level${levelVal + 1}Count`, 'specificationCount'];

		const results = await getResults(
			queryObj,
			Category,
			dbQuery,
			dbProject,
			'name',
			'position',
			1,
			15,
			populations
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const getSubCategoriesList = async (level: string, id: string, queryObj: QueryObj) => {
	try {
		const levelVal = parseInt(level);
		if (!queryObj || !levelVal || isNaN(levelVal) || !levels.includes(levelVal)) {
			throwError(400);
		}

		const dbQuery: any = {
			status: { $ne: 'deleted' }
		};

		if (levelVal === 1) {
			dbQuery.level1 = id;
			dbQuery.level2 = null;
			dbQuery.level3 = null;
		} else if (levelVal === 2) {
			dbQuery.level2 = id;
			dbQuery.level3 = null;
		} else if (levelVal === 3) {
			dbQuery.level3 = id;
		}

		const dbProject: any = {
			name: 1,
			thumb: 1,
			status: 1,
			level: 1,
			commission: 1,
			position: 1
		};

		const populations = [`level${levelVal + 2}Count`, 'specificationCount'];

		const results = await getResults(
			queryObj,
			Category,
			dbQuery,
			dbProject,
			'name',
			'position',
			1,
			15,
			populations
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const getAllCategoriesByLevel = async (level: string, queryObj: any) => {
	try {
		const levelVal = parseInt(level);
		if (!level || isNaN(levelVal) || !levels.includes(levelVal)) {
			throwError(400);
		}

		if ([2, 3, 4].includes(levelVal) && !queryObj.parentCategory) {
			throwError(400);
		}

		const dbQuery: any = {
			status: 'active',
			level: levelVal
		};
		if ([2, 3, 4].includes(levelVal)) {
			if (levelVal === 2) {
				dbQuery.level1 = queryObj.parentCategory;
			} else if (levelVal === 3) {
				dbQuery.level2 = queryObj.parentCategory;
			} else if (levelVal === 4) {
				dbQuery.level3 = queryObj.parentCategory;
			}
		}

		let categories = await Category.find(dbQuery)
			.select('name position')
			.sort({ position: 1 })
			.lean();

		return { data: categories };
	} catch (error) {
		throw error;
	}
};

export const getCategoryById = async (id: string) => {
	try {
		let category = await Category.findById(id)
			.populate([
				{
					path: 'level1',
					select: 'name thumb description level'
				},
				{
					path: 'level2',
					select: 'name thumb description level'
				},
				{
					path: 'level3',
					select: 'name thumb description level'
				}
			])
			.lean();

		if (!category) {
			throwError(404);
		}

		return category;
	} catch (error) {
		throw error;
	}
};

export const validateCategory = async (
	req: Request,
	res: Response,
	data: ICategory,
	cb: (upload: boolean) => {},
	file: any
) => {
	if (!data || !data.name) {
		res.errorRes(400);
		cb(false);
		return;
	} else {
		if (req.params.id) {
			let existingData = await Category.findOne({
				_id: req.params.id,
				status: { $ne: 'deleted' }
			});
			if (!existingData) {
				res.errorRes(404);
				cb(false);
				return;
			}
			let checkDuplicate: any = {
				name: data.name.trim(),
				status: { $ne: 'deleted' },
				_id: { $ne: req.params.id }
			};

			if (data.level1 && data.level2 && data.level3) {
				checkDuplicate.level3 = data.level3;
				checkDuplicate.level = 4;
			} else if (data.level1 && data.level2) {
				checkDuplicate.level2 = data.level2;
				checkDuplicate.level = 3;
			} else if (data.level1) {
				checkDuplicate.level1 = data.level1;
				checkDuplicate.level = 2;
			} else {
				checkDuplicate.level = 1;
			}
			let existingName = await Category.findOne(checkDuplicate);
			if (existingName) {
				res.errorRes(409);
				cb(false);
				return;
			}
			let check = await validateLevel(data);
			if (check) {
				cb(true);
				return;
			} else {
				res.errorRes(400);
				cb(false);
				return;
			}
		} else {
			let checkDuplicate: any = { name: data.name.trim(), status: { $ne: 'deleted' } };
			if (data.level1 && data.level2 && data.level3) {
				checkDuplicate.level3 = data.level3;
				checkDuplicate.level = 4;
			} else if (data.level1 && data.level2) {
				checkDuplicate.level2 = data.level2;
				checkDuplicate.level = 3;
			} else if (data.level1) {
				checkDuplicate.level1 = data.level1;
				checkDuplicate.level = 2;
			} else {
				checkDuplicate.level = 1;
			}
			let existingData = await Category.findOne(checkDuplicate);
			if (existingData) {
				res.errorRes(409);
				cb(false);
				return;
			} else {
				let check = await validateLevel(data);
				if (check) {
					cb(true);
					return;
				} else {
					res.errorRes(400);
					cb(false);
					return;
				}
			}
		}
	}
};

export const validateLevel = async (data: ICategory) => {
	let checkLevel1 = data.level1
		? await Category.findOne({
				_id: data.level1,
				status: { $ne: 'deleted' }
		  })
				.select('level')
				.lean()
		: null;

	let checkLevel2 = data.level2
		? await Category.findOne({
				_id: data.level2,
				status: { $ne: 'deleted' }
		  })
				.select('level')
				.lean()
		: null;

	let checkLevel3 = data.level3
		? await Category.findOne({
				_id: data.level3,
				status: { $ne: 'deleted' }
		  })
				.select('level')
				.lean()
		: null;

	if (data.level1 && data.level2 && data.level3) {
		return checkLevel1?.level === 1 && checkLevel2?.level === 2 && checkLevel3?.level === 3;
	} else if (data.level1 && data.level2) {
		return checkLevel1?.level === 1 && checkLevel2?.level === 2;
	} else if (data.level1) {
		return checkLevel1?.level === 1;
	} else {
		return true;
	}
};

export const addCategory = async (data: ICategory, files, user) => {
	try {
		data = deletePrivateProps(data);
		delete data.level;

		if (files) {
			for (let file of files) {
				if (file.fieldname === 'image') {
					data.image = file.location;
					const thumb = await createThumbWithBuffer(file.location);
					data.thumb = thumb;
				}
			}
		}

		if (data.level1 && data.level2 && data.level3) {
			data.level = 4;
		} else if (data.level1 && data.level2) {
			data.level = 3;
		} else if (data.level1) {
			data.level = 2;
		} else {
			data.level = 1;
		}

		data.createdBy = user?._id || null;
		let category = new Category(data);

		await category.save();
		return category;
	} catch (error) {
		throw error;
	}
};

export const updateCategory = async (id: string, data: ICategory, files, user) => {
	try {
		data = deletePrivateProps(data);
		delete data.level;

		if (files) {
			for (let file of files) {
				if (file.fieldname === 'image') {
					data.image = file.location;
					const thumb = await createThumbWithBuffer(file.location);
					data.thumb = thumb;
				}
			}
		}

		if (data.level1 && data.level2 && data.level3) {
			data.level = 4;
		} else if (data.level1 && data.level2) {
			data.level = 3;
		} else if (data.level1) {
			data.level = 2;
		} else {
			data.level = 1;
		}

		data.updatedBy = user?._id || null;
		let category = await Category.findByIdAndUpdate(
			id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();

		return category;
	} catch (error) {
		throw error;
	}
};

export const deleteCategory = async (id: string, user) => {
	try {
		const category = await Category.findById(id);
		if (!category) {
			throwError(404);
		}
		category.status = 'deleted';
		category.updatedBy = user?._id;
		await category.save();
		return category;
	} catch (error) {
		throw error;
	}
};

export const reorderCategories = async (data: any, user) => {
	try {
		if (!data.length) {
			throwError(400);
		}
		if (data.length) {
			for (const category of data) {
				if (category?._id && category?.position) {
					await Category.findByIdAndUpdate(
						category._id,
						{
							$set: {
								position: category.position
							}
						},
						{ useFindAndModify: false }
					).lean();
				}
			}
		}
		return;
	} catch (error) {
		throw error;
	}
};

export const updateStatusByCategoryId = async (id: string, status: string, user) => {
	try {
		if (!status || !['active', 'inactive'].includes(status)) {
			throwError(400);
		}

		let category = await Category.findById(id);

		if (category.level === 1) {
			if (status === 'inactive') {
				await Category.updateMany(
					{
						level1: category._id,
						status: 'active'
					},
					{
						$set: {
							status: status as any,
							updatedBy: user?._id || null
						}
					}
				);
			}
		} else if (category.level === 2) {
			if (status === 'inactive') {
				await Category.updateMany(
					{
						level2: category._id,
						status: 'active'
					},
					{
						$set: {
							status: status as any,
							updatedBy: user?._id || null
						}
					}
				);
			} else if (status === 'active') {
				await Category.findOneAndUpdate(
					{
						_id: category.level1,
						status: 'inactive'
					},
					{
						$set: {
							status: status as any,
							updatedBy: user?._id || null
						}
					}
				);
			}
		} else if (category.level === 3) {
			if (status === 'inactive') {
				await Category.updateMany(
					{
						level3: category._id,
						status: 'active'
					},
					{
						$set: {
							status: status as any,
							updatedBy: user?._id || null
						}
					}
				);
			} else if (status === 'active') {
				await Category.updateMany(
					{
						$or: [{ _id: category.level1 }, { _id: category.level2 }],
						status: 'inactive'
					},
					{
						$set: {
							status: status as any,
							updatedBy: user?._id || null
						}
					}
				);
			}
		} else if (category.level === 4) {
			if (status === 'active') {
				await Category.updateMany(
					{
						$or: [
							{ _id: category.level1 },
							{ _id: category.level2 },
							{ _id: category.level3 }
						],
						status: 'inactive'
					},
					{
						$set: {
							status: status as any,
							updatedBy: user?._id || null
						}
					}
				);
			}
		}

		if (!category) {
			throwError(404);
		}

		category.status = status as any;
		category.updatedBy = user?._id || null;
		await category.save();

		return category;
	} catch (error) {
		throw error;
	}
};

export const getSpecificationByCategoryId = async (id: string, queryObj: QueryObj) => {
	try {
		const dbQuery: any = {
			category: id,
			status: { $ne: 'deleted' }
		};

		const dbProject: any = {
			name: 1,
			position: 1,
			status: 1
		};

		const populations = [
			{
				path: 'values'
			}
		];

		const results = await getResults(
			queryObj,
			Specification,
			dbQuery,
			dbProject,
			'name',
			'position',
			1,
			15,
			populations
		);

		return results;
	} catch (error) {
		throw error;
	}
};

export const getSpecificationById = async (id: string) => {
	try {
		let specification = await Specification.findById(id)
			.populate([
				{
					path: 'category',
					select: 'name thumb description level'
				}
			])
			.lean();

		if (!specification) {
			throwError(404);
		}

		return specification;
	} catch (error) {
		throw error;
	}
};

export const addSpecification = async (data: ISpecification, user) => {
	try {
		if (!data || !data.name || !data.category) {
			throwError(400);
		}
		data = deletePrivateProps(data);

		let checkcat = await Category.findOne({
			_id: data.category,
			status: { $ne: 'deleted' }
		})
			.select('level')
			.lean();

		if (!checkcat) {
			throwError(400);
		}

		let existingData = await Specification.findOne({
			category: data.category,
			name: data.name,
			status: { $ne: 'deleted' }
		});

		if (existingData) {
			throwError(409);
		}

		data.createdBy = user?._id || null;
		let specification = new Specification(data);
		await specification.save();
		return specification;
	} catch (error) {
		throw error;
	}
};

export const updateSpecification = async (id: string, data: ISpecification, user) => {
	try {
		if (!data || !data.name || !data.category) {
			throwError(400);
		}

		data = deletePrivateProps(data);

		let checkcat = await Category.findOne({
			_id: data.category,
			status: { $ne: 'deleted' }
		})
			.select('level')
			.lean();

		if (!checkcat) {
			throwError(400);
		}

		let existingData = await Specification.findOne({
			category: data.category,
			name: data.name,
			_id: { $ne: id },
			status: { $ne: 'deleted' }
		});

		if (existingData) {
			throwError(409);
		}

		data.updatedBy = user?._id || null;
		let specification = await Specification.findByIdAndUpdate(
			id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();

		return specification;
	} catch (error) {
		throw error;
	}
};

export const deleteSpecification = async (id: string, user) => {
	try {
		const spec = await Specification.findById(id);
		if (!spec) {
			throwError(404);
		}
		spec.status = 'deleted';
		spec.updatedBy = user?._id;
		await spec.save();
		return spec;
	} catch (error) {
		throw error;
	}
};

export const reorderSpecification = async (data: any, user) => {
	try {
		if (!data.length) {
			throwError(400);
		}

		if (data.length) {
			for (const specification of data) {
				if (specification?._id && specification?.position) {
					await Specification.findByIdAndUpdate(
						specification._id,
						{
							$set: { position: specification.position }
						},
						{ new: true, useFindAndModify: false }
					).lean();
				}
			}
		}

		return;
	} catch (error) {
		throw error;
	}
};

export const updateStatusBySpecificationId = async (id: string, status: string, user) => {
	try {
		if (!status || !['active', 'inactive'].includes(status)) {
			throwError(400);
		}

		let specification = await Specification.findById(id);

		if (!specification) {
			throwError(404);
		}

		specification.status = status as any;
		specification.updatedBy = user?._id || null;
		await specification.save();

		return specification;
	} catch (error) {
		throw error;
	}
};

export const addSpecificationValue = async (data: ISpecificationValue, user) => {
	try {
		if (!data || !data.name || !data.category || !data.specification) {
			throwError(400);
		}

		data = deletePrivateProps(data);

		let checkcat = await Category.findOne({
			_id: data.category,
			status: { $ne: 'deleted' }
		})
			.select('level')
			.lean();

		let checkspecification = await Specification.findOne({
			_id: data.specification,
			status: { $ne: 'deleted' }
		})
			.select('level')
			.lean();

		if (!checkcat || !checkspecification) {
			throwError(400);
		}

		let existingData = await SpecificationValue.findOne({
			specification: data.specification,
			name: data.name,
			status: { $ne: 'deleted' }
		});

		if (existingData) {
			throwError(409);
		}

		data.createdBy = user?._id || null;
		let specification = new SpecificationValue(data);
		await specification.save();
		return specification;
	} catch (error) {
		throw error;
	}
};

export const updateSpecificationValue = async (id: string, data: ISpecificationValue, user) => {
	try {
		if (!data || !data.name || !data.category || !data.specification) {
			throwError(400);
		}

		data = deletePrivateProps(data);

		let checkcat = await Category.findOne({
			_id: data.category,
			status: { $ne: 'deleted' }
		})
			.select('level')
			.lean();

		let checkspecification = await Specification.findOne({
			_id: data.specification,
			status: { $ne: 'deleted' }
		})
			.select('level')
			.lean();

		if (!checkcat || !checkspecification) {
			throwError(400);
		}

		let existingData = await SpecificationValue.findOne({
			_id: { $ne: id },
			specification: data.specification,
			name: data.name,
			status: { $ne: 'deleted' }
		});

		if (existingData) {
			throwError(409);
		}

		data.updatedBy = user ? user._id : null;
		let specificationValue = await SpecificationValue.findByIdAndUpdate(
			id,
			{
				$set: data
			},
			{ new: true, useFindAndModify: false }
		).lean();

		return specificationValue;
	} catch (error) {
		throw error;
	}
};

export const deleteSpecificationValue = async (id: string, user) => {
	try {
		const value = await SpecificationValue.findById(id);
		if (!value) {
			throwError(404);
		}
		value.status = 'deleted';
		value.updatedBy = user?._id;
		await value.save();
		return value;
	} catch (error) {
		throw error;
	}
};

export const getSpecificationValueById = async (id: string) => {
	try {
		let specification = await SpecificationValue.findById(id)
			.populate([
				{
					path: 'category',
					select: 'name thumb description level'
				},
				{
					path: 'specification',
					select: 'name'
				}
			])
			.lean();

		if (!specification) {
			throwError(404);
		}

		return specification;
	} catch (error) {
		throw error;
	}
};

export const getSpecificationIdBySpecificationValues = async (id: string, queryObj: QueryObj) => {
	try {
		let specifications = await SpecificationValue.find({
			specification: id,
			status: { $ne: 'deleted' }
		})
			.sort({ position: 1 })
			.lean();

		return { data: specifications };
	} catch (error) {
		throw error;
	}
};

export const reOrderSpecificationValue = async (data: any, user) => {
	try {
		if (!data.length) {
			throwError(400);
		}

		if (data.length) {
			for (const specificationValue of data) {
				if (specificationValue?._id && specificationValue?.position) {
					await SpecificationValue.findByIdAndUpdate(
						specificationValue._id,
						{
							$set: { position: specificationValue.position }
						},
						{ new: true, useFindAndModify: false }
					).lean();
				}
			}
		}

		return;
	} catch (error) {
		throw error;
	}
};

export const updateStatusBySpecificationValueId = async (id: string, status: string, user) => {
	try {
		if (!status || !['active', 'inactive'].includes(status)) {
			throwError(400);
		}

		let specificationValue = await SpecificationValue.findById(id);

		if (!specificationValue) {
			throwError(404);
		}

		specificationValue.status = status as any;
		specificationValue.updatedBy = user?._id || null;
		await specificationValue.save();

		return specificationValue;
	} catch (error) {
		throw error;
	}
};
export const getAllSpecificationByCategory = async (category: string) => {
	try {
		if (!category) {
			throwError(400);
		}
		const dbQuery: any = {
			status: 'active',
			category: category
		};
		let specifications = await Specification.find(dbQuery)
			.select('name position')
			.sort({ position: 1 })
			.lean();

		return { data: specifications };
	} catch (error) {
		throw error;
	}
};

export const getAllLevel4Categories = async () => {
	try {
		const dbQuery: any = {
			status: 'active',
			level: 4
		};
		let category = await Category.find(dbQuery).lean();

		return category;
	} catch (error) {
		throw error;
	}
};

// get categories for show seller on admin panel
export const getCategoriesAccordingParentCategory = async (id, level, seller) => {
	let query = {
		...(level == 2
			? { level1: id }
			: level == 3
			? { level2: id }
			: level == 4
			? { level3: id }
			: {}),
		level: +level as 1 | 2 | 3 | 4,
		seller: seller
	};

	let categories = await SellerCategory.find(query);

	//categories.map((l1: any) => {
	// 	if (level == 1) {
	// 		delete l1['sub'];
	// 		data.push(l1);
	// 	}
	// 	l1.sub.map((l2: any) => {
	// 		if (level == 2 && l1._id == id) {
	// 			delete l2['sub'];
	// 			data.push(l2);
	// 		}
	// 		l2.sub.map((l3: any) => {
	// 			if (level == 3 && l2._id == id) {
	// 				delete l3['sub'];
	// 				data.push(l3);
	// 			}

	// 			l3.sub.map((l4) => {
	// 				if (level == 4 && l3._id == id) {
	// 					delete l4['sub'];
	// 					data.push(l4);
	// 				}
	// 			});
	// 		});
	// 	});
	// });

	return categories;
};
// export const getCategoriesAccordingParentCategory = async (id, level, seller) => {
// 	let query = {
// 		...(level == 2 ? { level1: id } : level == 3 ? { level2: id } : { level3: id }),
// 		level: +level as 1 | 2 | 3 | 4,
// 		seller: seller
// 	};

// 	let categories = await SellerCategory.find(query);

// 	let data = [];

// 	categories.forEach((category: any) => {
// 		let subcategories = category.sub;

// 		if (level == 1) {
// 			delete category.sub;
// 			data.push(category);
// 		}

// 		subcategories.forEach((subcategory) => {
// 			if (level == 2 && category._id == id) {
// 				delete subcategory.sub;
// 				data.push(subcategory);
// 			}

// 			let subsubcategories = subcategory.sub;

// 			subsubcategories.forEach((subsubcategory) => {
// 				if (level == 3 && subcategory._id == id) {
// 					delete subsubcategory.sub;
// 					data.push(subsubcategory);
// 				}

// 				let subsubsubcategories = subsubcategory.sub;

// 				subsubsubcategories.forEach((subsubsubcategory) => {
// 					if (level == 4 && subsubcategory._id == id) {
// 						delete subsubsubcategory.sub;
// 						data.push(subsubsubcategory);
// 					}
// 				});
// 			});
// 		});
// 	});

// 	return data;
// };
