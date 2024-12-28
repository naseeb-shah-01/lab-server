import { QueryObj } from '../middlewares/query';
import { Model, Query } from 'mongoose';

export const getSort = (queryObj: QueryObj, fallbackSort?: string, fallbackOrder?: 1 | -1): any => {
	if (fallbackSort.includes(', ')) {
		const sort = fallbackSort.split(', ');
		const obj = {};
		sort.forEach((item) => {
			let objItem = item.split(': ');
			obj[objItem[0]] = objItem[1];
		});
		return obj;
	}
	const sort = queryObj.sort || fallbackSort || 'name';
	const order = queryObj.order || fallbackOrder || 'asc';
	return {
		[sort]: order === 'asc' || order === 1 ? 1 : -1,
		...(sort !== '_id' ? { _id: 1 } : {})
	};
};

export const getSkip = (queryObj: QueryObj, fallbackLimit?: number): number => {
	let limit = getLimit(queryObj, fallbackLimit);
	let page = getPage(queryObj);
	return limit === 0 || limit > 0 ? limit * (page - 1) : 0;
};

export const getPage = (queryObj: QueryObj): number => {
	let page = queryObj.page || 1;
	return page;
};

export const getLimit = (queryObj: QueryObj, fallbackLimit?: number): number => {
	return +queryObj.limit === 0 || +queryObj.limit > 0 ? +queryObj.limit : fallbackLimit || 0;
};

export const getSearch = (queryObj: QueryObj): string => {
	return queryObj.search || null;
};

export interface IListResponse {
	data: any[];
	total: number;
	page: number;
	limit: number;
	search: string;
	sort: string;
	order: string;
	[key: string]: any;
}

export const getResults = async (
	queryObj: QueryObj,
	dbModel: Model<any>,
	dbQuery: any,
	dbProject: any,
	searchProp: string,
	fallbackSort: string = 'name',
	fallbackSortOrder: 1 | -1,
	fallbackLimit: number,
	population?: any[]
): Promise<IListResponse> => {
	let sort = getSort(queryObj, fallbackSort, fallbackSortOrder);
	let skip = getSkip(queryObj, fallbackLimit);
	let page = getPage(queryObj);
	let limit = getLimit(queryObj, fallbackLimit);
	let search = getSearch(queryObj);
	let queryProject: any = {};
	if (search) {
		dbQuery.$text = {
			$search: search
		};
		queryProject.score = {
			$meta: 'textScore'
		};
		sort = {
			score: { $meta: 'textScore' },
			...sort
		};
	}
	let results = [];
	let total = await dbModel.find(dbQuery).countDocuments();

	if (total) {
		let q = dbModel.find(dbQuery, queryProject).sort(sort).skip(skip).limit(limit);
		if (population && population.length) {
			for (let p of population) {
				q = q.populate(p);
			}
		}
		if (dbProject) {
			q = q.select(dbProject);
		}
		results = await q.lean();
	} else {
		delete dbQuery.$text;
		delete queryProject.score;
		delete sort.score;
		sort = getSort(queryObj, fallbackSort, fallbackSortOrder);
		if (search) {
			dbQuery[searchProp] = {
				$regex: search,
				$options: 'i'
			};
			total = await dbModel.find(dbQuery).countDocuments();
			if (total) {
				let q = dbModel.find(dbQuery, queryProject).sort(sort).skip(skip).limit(limit);
				if (population && population.length) {
					for (let p of population) {
						q = q.populate(p);
					}
				}
				if (dbProject) {
					q = q.select(dbProject);
				}
				results = await q.lean();
			}
		}
	}

	return {
		data: results,
		total: total,
		page: page,
		limit: limit,
		search: search,
		sort: Object.keys(sort)[0] || '',
		order:
			sort[Object.keys(sort)[0]] === 'asc' || sort[Object.keys(sort)[0]] === 1
				? 'asc'
				: 'desc'
	};
};

export const aggregatePopulate = async (
	aggregateDatabase: any,
	aggregateQuery: [],
	populateDatabase,
	populateField: String,
	projectionField: Object
) => {
	let results = await aggregateDatabase.aggregate(aggregateQuery);

	let populate = await populateDatabase.populate(results, {
		path: populateField,
		select: projectionField
	});

	return populate;
};
export const deletePrivateProps = (reqBody, deleteId = true) => {
	if (deleteId) {
		delete reqBody._id;
	}
	delete reqBody.status;
	delete reqBody.createdBy;
	delete reqBody.updatedBy;
	delete reqBody.createdAt;
	delete reqBody.updatedAt;
	return reqBody;
};
