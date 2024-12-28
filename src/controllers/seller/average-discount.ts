import { CronJob } from 'cron';
import { model, Types } from 'mongoose';
import { ISeller } from '../../models/customer/seller';
import { IProduct } from '../../models/seller/product';
const Seller = model<ISeller>('NewCustomer');
const Product = model<IProduct>('NewProduct');

const ObjectId = Types.ObjectId;

export const setSellerAverageDiscount = () => {
	try {
		updateSellerAverageDiscount();
	} catch (e) {}
};

export const updateSellerAverageDiscount = async () => {
	try {
		let allSelller = await Seller.find({}).select('_id');

		for (let seller of allSelller) {
			let caluculatePrice = await Product.aggregate([
				{
					$match: {
						seller: ObjectId(seller._id)
					}
				},
				{
					$group: {
						_id: null,
						totalSellingPrice: { $sum: '$minPrice.sellingPrice' },
						totalPrice: { $sum: '$minPrice.price' }
					}
				}
			]);

			if (caluculatePrice[0]?.totalPrice) {
				let averageDiscount =
					((caluculatePrice[0].totalPrice - caluculatePrice[0].totalSellingPrice) /
						caluculatePrice[0].totalPrice) *
					100;
				let updateSellerWithAverageDiscount = await Seller.updateOne(
					{ _id: seller._id },
					{
						$set: {
							averageDiscount: averageDiscount
						}
					}
				);
			}
		}
	} catch (e) {}
};
