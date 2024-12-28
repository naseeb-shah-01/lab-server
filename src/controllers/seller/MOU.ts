import { createPDF, savePDF } from '../../helpers/pdf';
import { renderFile } from 'ejs';
import path from 'path';
import { Request, Response } from 'express';
import { ISeller } from '../../models/customer/seller';
import { model } from 'mongoose';
import CategoryModel from '../../models/category/category';
const Seller = model<ISeller>('NewCustomer');

export const validateSignature = async (
	req: Request,
	res: Response,
	data: ISeller,
	cb: (upload: boolean) => {},
	file: any
) => {
	let files: any = req;
	let key = files?.files[0]?.fieldname ? files?.files[0]?.fieldname : '';
	if (key !== 'signature') {
		res.errorRes(400);
		cb(false);
		return;
	} else {
		cb(true);
		return;
	}
};

export const generateMOU = async (user: ISeller, queryObj: any, data: any) => {
	try {
		let signature = '';
		if (data) {
			signature = data.signature;
		}
		const seller = await Seller.findById(user._id)
			.populate({
				path: 'productCategory',
				select: 'name commission insured insurance',
				options: { lean: true },
				match: { status: 'active', level: 1 }
			})
			.lean();

		const categories = await CategoryModel.aggregate([
			{
				$match: {
					status: 'active',
					level: 1
				}
			},
			{
				$sort: { position: 1 }
			},
			{
				$project: {
					_id: 1,
					name: 1,
					position: 1,
					level: 1,
					commission: 1,
					thumb: 1,
					services: 1,
					insurance: 1
				}
			}
		]);

		const subscription = queryObj;
		if (seller) {
			const viewName = 'MOU.ejs';
			const html = await renderFile(
				path.resolve(__dirname, '../../assets/views/', viewName),
				{
					seller,
					subscription,
					signature,
					categories
				}
			);
			const pdfBuffer = await createPDF(html);

			return pdfBuffer;
		}
	} catch (error) {
		console.error(error);
	}
};

export const uploadMOU = async (user: ISeller, queryObj: any, data: any, file: any) => {
	try {
		const data_ = { signature: file[0]?.location };
		const seller = await Seller.findById(user._id, 'contract');
		const pdfBuffer = await generateMOU(seller, queryObj, data_);
		const url = await savePDF(pdfBuffer, `mou-${seller._id}-${Date.now()}.pdf`);
		seller.contract = [url, ...seller.contract];
		seller.kyc = true;
		await seller.save();
		return url;
	} catch (error) {
		console.error(error);
	}
};

export const getMOU = async (sellerId: string) => {
	try {
		const seller = await Seller.findById(sellerId);
		if (seller) {
			return seller.contract[0];
		}
		return 'Seller does not exist';
	} catch (error) {
		throw error;
	}
};
