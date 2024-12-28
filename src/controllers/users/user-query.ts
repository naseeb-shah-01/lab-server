export const usersListQuery = (textSearch: string, search: string, onlyTotal: boolean, sort, skip, limit, userIds, filterType) => {
    let query: any[] = [
        {
            $match: {
                status: 'active',
                admin: false,
                ...(userIds ? { _id: { $in: userIds } } : {}),
                ...(textSearch ? { $text: { $search: textSearch } } : {})
            }
        },
        {
            $project: {
                ...(textSearch ? { score: { $meta: 'textScore' } } : {}),
                firstName: 1,
                lastName: 1,
                name: { $concat: [{ $ifNull: [{ $concat: ['$firstName', ' '] }, ''] }, { $ifNull: ['$lastName', ''] }] },
                contact: 1,
                email: 1,
                updatedAt: 1,
            }
        }
    ];

    if (search) {
        query.push({
            $match: {
                name: {
                    $regex: search,
                    $options: 'i'
                }
            }
        });
    }

    let project: any = {
        score: 1,
        firstName: 1,
        lastName: 1,
        name: 1,
        contact: 1,
        email: 1,
        updatedAt: 1,
    };


    query.push(
        {
            $project: project
        }
    );

    if (textSearch) {
        sort = { ...sort };
        for (let key in sort) {
            delete sort[key];
        }
        sort.score = {
            $meta: 'textScore'
        };
    }

    if (onlyTotal) {
        query.push(
            {
                $count: 'total'
            }
        );
    } else {
        query.push(
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
                        ...(limit > 0 ? [{ $limit: limit }] : []),
                    ]
                }
            }
        );
    }

    return query;
}
