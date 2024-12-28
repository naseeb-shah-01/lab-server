import { CronJob } from 'cron';
import { model, Types } from 'mongoose';
import { getResults } from '../../helpers/query';
import { QueryObj } from '../../middlewares/query';
import { ISeller } from '../../models/customer/seller';
import { IOrder } from '../../models/order/order';
const Order = model<IOrder>('Order');
const Seller = model<ISeller>('NewCustomer');
const ObjectId = Types.ObjectId;

export const getInvoices = async (queryObj: QueryObj, user) => {
	try {
		const dbQuery = {
			buyer: user._id,
			'cancelled.status': false,
			'rejected.status': false,
			'returned.status': false,
			'invoices.buyer': { $exists: true, $ne: null }
		};
		const dbProject = {
			'sellerDetails.name': 1,
			invoiceNumber: 1,
			order: 1,
			invoices: 1,
			'items.name': 1
		};
		const results = await getResults(
			queryObj,
			Order,
			dbQuery,
			dbProject,
			'businessName',
			'createdAt',
			-1,
			15
		);
		return results;
	} catch (error) {
		throw error;
	}
};

export const getAllSellers = async () => {
	let allSellers = await Seller.find({}, { id: 1 });
};
new CronJob(
	'* * * * *',
	function () {
		// sellerSettlement('abc', true);
	},
	null,
	true
);
export const sellerSettlement = async (sellerId, hasPan) => {
	let ordersBasisOfDeliveryMethod = await Order.aggregate([
		// {
		// 	$match: {
		// 		// seller: ObjectId(sellerId)
		// 		// dates will here
		// 	}
		// },
		{
			$addFields: {
				gatewayCharges: {
					$cond: [{ $paymentMode: 'cod' }, 0, { $multiply: ['$order.totalAmt', 0.2] }]
				}
			}
		},
		{
			$addFields: {
				gst18: {
					$multiply: [{ $add: ['$commission.netAmt', '$gatewayCharges'] }, 0.18]
				},
				tds: {
					$cond: [
						{ hasPan: true },
						{ $multiply: ['$order.totalAmt', 0.1] },
						{ $multiply: ['$order.totalAmt', 0.5] }
					]
				},
				tcs: {
					$multiply: [
						{
							$subtract: [
								'$order.totalAmt',
								{ $multiply: ['$commission.restaurantGst', 5] }
							]
						}
					]
				}
			}
		}
	]);
};
