import { Request, Response } from 'express';
import { model, Types } from 'mongoose';
import { throwError } from '../../helpers/throw-errors';
import { createThumbWithBuffer } from '../../helpers/thumb';
import { ISeller } from '../../models/customer/seller';
import { IAttendance } from '../../models/rider/workingHours';
import { IRider } from '../../models/rider/rider';
import { updateSellerSession } from './session';
import { QueryObj } from '../../middlewares/query';
import { getResults } from '../../helpers/query';
const Seller = model<ISeller>('NewCustomer');
const Rider = model<IRider>('Rider');
const ObjectId = Types.ObjectId;
const Attendance = model<IAttendance>('Attendance');

export const getMyProfile = async (user) => {
	try {
		const profile = await Seller.findOne({
			_id: user._id,
			status: 'active'
		})
			.select(
				'avatar name shopPhotos email contact yearOfEstablishment packingTime deliveryMode.selfdelivery.freeDeliveryAmount deliveryMode.selfdelivery.deliveryTime deliveryMode.selfdelivery.deliveryRadius deliveryMode.selfdelivery.deliveryCharges deliveryMode.platform.freeDeliveryAmount'
			)
			.lean();

		if (!profile) {
			throwError(404);
		}

		return profile;
	} catch (error) {
		throw error;
	}
};

export const updateMyProfile = async (body, user, session) => {
	try {
		const profile = await Seller.findOne({
			_id: user._id,
			status: 'active'
		});

		if (!profile) {
			throwError(404);
		}

		const existingContactSeller = await Seller.findOne({
			_id: { $ne: user._id },
			contact: body.contact.trim()
		});

		if (existingContactSeller) {
			throwError(409);
		}

		profile.email = body.email;
		profile.contact = body.contact;
		profile.name = body.name;
		profile.yearOfEstablishment = body.yearOfEstablishment;
		profile.packingTime = body.packingTime;
		profile.deliveryMode.selfdelivery.freeDeliveryAmount = body?.freeDeliveryAmount;
		profile.deliveryMode.selfdelivery.deliveryTime = body?.deliveryTime;
		profile.deliveryMode.selfdelivery.deliveryRadius = body?.deliveryRadius;
		profile.deliveryMode.selfdelivery.deliveryCharges = body?.charges;
		profile.deliveryMode.platform.freeDeliveryAmount = body?.quickMinAmt;
		profile.save();
		updateSellerSession(session, profile);
		const data = profile.toJSON();
		delete data.sessions;
		return data;
	} catch (error) {
		throw error;
	}
};

export const getAllSellerRider = async (user, queryObj: QueryObj) => {
	let approvalOfSeller = true;
	if (queryObj.sellerApproved == 'false') {
		approvalOfSeller = false;
	}
	try {
		let dbQuery = {
			seller: ObjectId(user._id),
			sellerApproved: approvalOfSeller
		};

		const dbProject: any = {};

		const results = await getResults(
			queryObj,
			Rider,
			dbQuery,
			dbProject,
			'name',
			'position',
			1,
			15
		);
		return results;
	} catch (error) {
		throw error;
	}
};

export const getSellerRiderDetail = async (id: string) => {
	try {
		const rider = await Rider.findOne({
			_id: id
		})
			.populate({
				path: 'activeOrders',
				populate: {
					path: 'seller buyer'
				}
			})
			.lean();
		if (!rider) {
			throwError(505);
		}

		const today = new Date();
		const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8);

		let attendance: any = await Attendance.findOne({
			riderId: id,
			createdAt: { $gte: startOfToday }
		}).populate({
			path: 'rejctedOrders',
			populate: {
				path: 'seller buyer'
			}
		});

		if (!attendance) {
			attendance = {};
		}
		return { ...rider, attendance };
	} catch (error) {
		throw error;
	}
};

export const approveRider = async (id, data, user) => {
	const { status } = data;
	try {
		if (!user._id) {
			throwError(405);
		}
		await Rider.updateOne(
			{
				_id: ObjectId(id)
			},
			{
				$set: {
					approved: status,
					sellerApproved: status
				}
			}
		);
		return;
	} catch (err) {
		throwError(405);
	}
};

export const getBusinessProfile = async (user) => {
	try {
		const businessProfile = await Seller.findOne({
			_id: user._id,
			status: 'active'
		})
			.select('shopLocation shopName businessName yearOfEstablishment shopPhotos')
			.lean();

		if (!businessProfile) {
			throwError(404);
		}

		return businessProfile;
	} catch (error) {
		throw error;
	}
};

//validate seller shopPhotos
export const validateSeller = async (
	req: Request,
	res: Response,
	data: ISeller,
	cb: (upload: boolean) => {},
	file: any
) => {
	if (!data.businessName || !data.shopPhotos) {
		res.errorRes(400);
		cb(false);
		return;
	}

	cb(true);
	return;
};

export const validateBusinessProfile = async (
	req: Request,
	res: Response,
	data: ISeller,
	cb: (upload: boolean) => {},
	file: any
) => {
	if (!data.businessName || !data.shopPhotos) {
		res.errorRes(400);
		cb(false);
		return;
	}
	let user = req.getUser();
	const profile = await Seller.findOne({
		_id: user._id,
		status: 'active'
	});

	if (!profile) {
		res.errorRes(404);
		cb(false);
		return;
	}

	cb(true);
	return;
};

export const updateBusinessProfile = async (body, files, user, session) => {
	try {
		const businessProfile = await Seller.findOne({
			_id: user._id,
			status: 'active'
		});

		if (!businessProfile) {
			throwError(404);
		}
		const shopPhotos = body.shopPhotos || [];
		if (files.length) {
			for (let file of files) {
				if (file.fieldname === 'newShopPhotos') {
					const thumb = await createThumbWithBuffer(file.location, 600);
					shopPhotos.push({
						thumb: thumb,
						image: file.location
					});
				}
			}
		}

		businessProfile.shopPhotos = shopPhotos;
		businessProfile.shopName = body.shopName;
		businessProfile.businessName = body.businessName;
		businessProfile.yearOfEstablishment = body.yearOfEstablishment;

		businessProfile.save();

		updateSellerSession(session, businessProfile);

		return businessProfile;
	} catch (error) {
		throw error;
	}
};

export const getAccountSettings = async (user) => {
	try {
		const accountSettings = await Seller.findOne({
			_id: user._id,
			status: 'active'
		})
			.select('gst kycDocument addresses bankDetails vacation drugNumber contract')
			.lean();

		if (!accountSettings) {
			throwError(404);
		}

		return accountSettings;
	} catch (error) {
		throw error;
	}
};

export const updateAccountSettings = async (body, user, session) => {
	try {
		if (!body?.addresses?.length) {
			throwError(400);
		}
		const billingIndex = body.addresses.findIndex((a) => a.billing === true);
		const primaryIndex = body.addresses.findIndex((a) => a.primary === true);
		const invalidAddressIndex = body.addresses.findIndex(
			(a) =>
				!a.line1 ||
				a.line1?.trim() === '' ||
				!a.state ||
				a.state?.trim() === '' ||
				!a.pincode ||
				a.pincode?.trim() === '' ||
				!a.city ||
				a.city?.trim() === ''
		);
		if (billingIndex === -1 || primaryIndex === -1 || invalidAddressIndex >= 0) {
			throwError(400);
		}
		const accountSettings = await Seller.findOne({
			_id: user._id,
			status: 'active'
		});

		if (
			body.vacation?.startDate &&
			body.vacation?.endDate &&
			new Date(body.vacation?.startDate) > new Date(body.vacation?.endDate)
		) {
			throwError(400);
		}

		if (!accountSettings) {
			throwError(404);
		}

		accountSettings.addresses = body.addresses;
		accountSettings.bankDetails = body.bankDetails;
		accountSettings.vacation = body.vacation;
		accountSettings.save();

		updateSellerSession(session, accountSettings);

		return accountSettings;
	} catch (error) {
		throw error;
	}
};

export const updateAddresses = async (data: any, user, session) => {
	try {
		const seller = await Seller.findOne({
			_id: user._id,
			status: 'active'
		});

		if (!seller) {
			throwError(404);
		}

		seller.addresses = data;
		await seller.save();
		return seller.addresses;
	} catch (error) {
		throw error;
	}
};
