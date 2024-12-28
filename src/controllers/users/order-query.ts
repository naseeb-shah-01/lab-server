import { Types } from 'mongoose';

const ObjectId = Types.ObjectId;

export const orderListQuery = (
	search: string,
	onlyTotal: boolean,
	sort,
	skip,
	limit,
	status: string
) => {
	let query: any[] = [
		{
			$match: {
				status: { $ne: 'deleted' },
				...(status === 'accepted'
					? {
							$or: [
								{
									isGroupOrder: false
								},
								{
									isGroupOrder: true,
									'matured.status': true
								}
							]
					  }
					: {}),
				...(status !== 'all' ? { 'currentStatus.status': status } : {})
			}
		}
	];
	if (search) {
		query.push({
			$match: {
				$or: [
					...(ObjectId.isValid(search)
						? [
								{
									_id: ObjectId(search)
								}
						  ]
						: []),
					{
						'sellerDetails.name': {
							$regex: search,
							$options: 'i'
						}
					},
					{
						'buyerDetails.name': {
							$regex: search,
							$options: 'i'
						}
					}
				]
			}
		});
	}

	let project: any = {
		score: 1,
		rider: 1,
		buyerDetails: 1,
		sellerDetails: 1,
		isGroupOrder: 1,
		runningDuration: 1,
		groupOrder: 1,
		paymentMode: 1,
		onlinePayment: 1,
		codPayment: 1,
		order: 1,
		delivery: 1,
		refund: 1,
		accepted: 1,
		matured: 1,
		rejected: 1,
		sellerDispatched: 1,
		dispatched: 1,
		delivered: 1,
		notReceived: 1,
		returned: 1,
		returnRequest: 1,
		cancelled: 1,
		currentStatus: 1,
		createdAt: 1,
		rating: 1
	};

	query.push({
		$project: project
	});

	if (onlyTotal) {
		query.push({
			$count: 'total'
		});
	} else {
		query.push({
			$facet: {
				metadata: [
					{
						$count: 'total'
					}
				],
				results: [
					{ $sort: sort },
					{ $skip: skip },
					...(limit > 0 ? [{ $limit: limit }] : []),
					{
						$lookup: {
							from: 'riders',
							localField: 'rider',
							foreignField: '_id',
							as: 'rider'
						}
					},
					{
						$unwind: {
							path: '$rider',
							preserveNullAndEmptyArrays: true
						}
					}
				]
			}
		});
	}

	return query;
};

export const runningOrdersListQuery = (search: string, sort, skip, limit) => {
	let query: any[] = [
		{
			$match: {
				status: { $ne: 'deleted' },
				completed: false
			}
		},
		{
			$lookup: {
				from: 'customers',
				localField: 'seller',
				foreignField: '_id',
				as: 'seller'
			}
		},
		{
			$unwind: {
				path: '$seller',
				preserveNullAndEmptyArrays: false
			}
		}
	];

	if (search) {
		query.push({
			$match: {
				$or: [
					...(ObjectId.isValid(search)
						? [
								{
									_id: ObjectId(search)
								}
						  ]
						: []),
					{
						'seller.businessName': {
							$regex: search,
							$options: 'i'
						}
					}
				]
			}
		});
	}

	query.push(
		{
			$project: {
				seller: {
					_id: 1,
					businessName: 1,
					name: 1,
					priceTable: 1
				},
				completed: 1,
				processed: 1,
				startDate: 1,
				endDate: 1,
				duration: 1,
				discount: 1,
				buyers: 1,
				total: 1,
				maxDiscount: 1,
				createdAt: 1
			}
		},
		{
			$facet: {
				metadata: [
					{
						$count: 'total'
					}
				],
				results: [
					{ $sort: sort },
					{ $skip: skip },
					...(limit > 0 ? [{ $limit: limit }] : [])
				]
			}
		}
	);

	return query;
};
