export const getSellerFilterQuery = (buyersCategories, id: any, skip, limit) => {
	let query: any[] = [
		{
			$match: {
				status: 'active',
				level4: { $in: buyersCategories },
				_id: { $ne: id }
			}
		},
		{
			$lookup: {
				from: 'products',
				// foreignField: 'seller',
				// localField: '_id',
				let: { sellerId: '$_id' },
				pipeline: [
					{
						$match: {
							// status: 'active',
							$expr: { $eq: ['$seller', '$$sellerId'] }
						}
					},
					{
						$count: 'total'
					}
				],
				as: 'products'
			}
		},
		{
			$unwind: '$products'
		},
		{
			$lookup: {
				from: 'orders',
				let: { sellerId: '$_id' },
				pipeline: [
					{
						$match: {
							'accepted.status': true,
							$expr: { $eq: ['$seller', '$$sellerId'] }
						}
					},
					{
						$count: 'total'
					}
				],
				as: 'orders'
			}
		},
		{
			$unwind: '$orders'
		},
		{
			$project: {
				product: '$products.total',
				order: '$orders.total',
				avatar: 1,
				shopPhotos: 1,
				name: 1,
				businessName: 1
			}
		},
		{
			$facet: {
				metadata: [
					{
						$count: 'total'
					}
				],
				results: [{ $skip: skip }, ...(limit > 0 ? [{ $limit: limit }] : [])]
			}
		}
	];

	return query;
};
