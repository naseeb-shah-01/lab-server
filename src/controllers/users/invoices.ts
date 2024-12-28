import { isValidObjectId, model } from 'mongoose';
import { getLimit, getPage, getSearch, getSkip, getSort } from '../../helpers/query';
import { QueryObj } from '../../middlewares/query';
import { IOrder } from '../../models/order/order';
const Order = model<IOrder>('Order');

export const getInvoices = async (queryObj: QueryObj, user) => {
	try {
		let sort = getSort(queryObj, 'createdAt', -1);
		let skip = getSkip(queryObj, 15);
		let page = getPage(queryObj);
		let limit = getLimit(queryObj, 15);
		let search = getSearch(queryObj);
		let startDate = queryObj.startDate ? new Date(queryObj.startDate) : null;
		let endDate = queryObj.endDate ? new Date(queryObj.endDate) : null;

		const dbQuery = {
			'cancelled.status': false,
			'rejected.status': false,
			'returned.status': false,
			$or: [
				{ 'invoices.aekatra': { $exists: true, $ne: null } },
				{ 'invoices.buyer': { $exists: true, $ne: null } },
				{ 'invoices.delivery': { $exists: true, $ne: null } }
			],
			...(search ? (isValidObjectId(search) ? { _id: search } : { dummy: 1 }) : {}),
			...(startDate && endDate ? { createdAt: { $lt: endDate, $gte: startDate } } : {})
		};

		const dbProject = {
			_id: 1,
			invoiceNumber: 1,
			createdAt: 1,
			'sellerDetails.name': 1,
			'buyerDetails.name': 1,
			invoices: 1,
			order: 1,
			commission: 1,
			delivery: 1
		};

		let total = await Order.find(dbQuery).countDocuments();
		let results = await Order.find(dbQuery, dbProject).sort(sort).skip(skip).limit(limit);

		return {
			data: results,
			total: total,
			limit: limit,
			sort: Object.keys(sort)[0] || '',
			order:
				sort[Object.keys(sort)[0]] === 'asc' || sort[Object.keys(sort)[0]] === 1
					? 'asc'
					: 'desc',
			page: page,
			search: search
		};
	} catch (error) {
		throw error;
	}
};
