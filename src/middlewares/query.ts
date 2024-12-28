import { NextFunction, Response, Request } from 'express';
import log from '../helpers/logger';

export class QueryObj {
	limit?: number;
	page?: number;
	search?: string;
	sort?: string;
	order?: string | number;
	[key: string]: any;
}

export const checkQuery = (req: Request, res: Response, next: NextFunction) => {
	try {
		if (req.query) {
			const query = JSON.parse(JSON.stringify(req.query));
			const queryObj: QueryObj = {};
			for (const prop in query) {
				if (
					prop !== 'sort' &&
					prop !== 'limit' &&
					prop !== 'page' &&
					prop !== 'search' &&
					prop !== 'order'
				) {
					queryObj[prop] = query[prop];
				}
			}

			// Page (Skip) & Limit
			if (
				(query.limit || query.limit === 0 || query.limit > 0) &&
				parseInt(query.limit) >= 0
			) {
				queryObj.limit = parseInt(query.limit);
				if (!query.page || !parseInt(query.page)) {
					queryObj.page = 1;
				} else {
					queryObj.page = parseInt(query.page);
				}
			}

			// Sort
			if (query.sort) {
				queryObj.sort = query.sort.toString();
			}

			// Sort Order
			if (query.order) {
				queryObj.order = query.order;
			}

			// Search
			if (query.search) {
				queryObj.search = query.search;
			}

			req.query = queryObj as any;
		} else {
			req.query = {};
		}
		next();
	} catch (error) {
		log.error('Query error : ', error);
		req.query = {};
		next();
	}
};
