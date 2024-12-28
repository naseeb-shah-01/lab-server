import { Request, Response } from 'express';
import { model } from 'mongoose';
import { throwError } from '../../helpers/throw-errors';
import { createThumbWithBuffer } from '../../helpers/thumb';
import { ICustomer } from '../../models/customer/customer';
import { ISeller } from '../../models/customer/seller';
import { updateCustomerSession } from './session';
import { calculateDistanceTwo } from '../../helpers/calculateDistance';
const Customer = model<ICustomer>('Customer');
const Seller = model<ISeller>('NewCustomer');

export const getMyProfile = async (user) => {
	try {
		const profile = await Customer.findOne({
			_id: user._id,
			status: 'active'
		})
			.select('avatar name email contact codBlock')
			.lean();

		if (!profile) {
			throwError(404);
		}
console.log("Profile",profile)
		return profile;
	} catch (error) {
		throw error;
	}
};

export const updateMyProfile = async (body, user, session) => {
	//Actually it's update seller data
	try {
		const profile = await Customer.findOne({
			_id: user._id,
			status: 'active'
		});

		if (!profile) {
			throwError(404);
		}

		// const existingContactCustomer = await Customer.findOne({
		// 	_id: { $ne: user._id },
		// 	contact: body.contact.trim()
		// });

		const existingContactCustomer = await Customer.findOne({
			_id: { $ne: user._id },
			contact: body.contact.trim()
		});

		if (existingContactCustomer) {
			throwError(409);
		}

		profile.email = body.email;
		profile.contact = body.contact;
		profile.name = body.name;

		profile.save();

		updateCustomerSession(session, profile);
		const data = profile.toJSON();
		delete data.sessions;
		return data;
	} catch (error) {
		throw error;
	}
};

export const getAccountSettings = async (user, query) => {
	try {
		let maxDistance = 10;
		let { seller } = query;
		let sellers = await Seller.findOne({ _id: seller }).select('shopLocation').lean();

		const accountSettings = await Customer.findOne({
			_id: user._id,
			status: 'active'
		})
			.select('addresses')
			.lean();
		let sellerCoor = sellers.shopLocation.coordinates;
		let deliveredAddresses = [];
		accountSettings.addresses.forEach((add: any) => {
			let buyerCoor = add.location.coordinates;
			let distance = calculateDistanceTwo(
				buyerCoor[1],
				buyerCoor[0],
				sellerCoor[1],
				sellerCoor[0]
			);
			let newAdd = {
				...add,
				disable: distance > maxDistance
			};
			deliveredAddresses.push(newAdd);
		});

		accountSettings.addresses = deliveredAddresses;
		if (!accountSettings) {
			throwError(404);
		}

		return accountSettings;
	} catch (error) {
		throw error;
	}
};
export const getBuyerAddresses = async (user) => {
	try {
		const buyer = await Customer.findOne({
			_id: user._id,
			status: 'active'
		})
			.select('addresses')
			.lean();

		if (!buyer) {
			throwError(404);
		}

		return buyer;
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
				a.city?.trim() === '' ||
				!a.location
		);
		if (billingIndex === -1 || primaryIndex === -1 || invalidAddressIndex >= 0) {
			throwError(400);
		}
		const accountSettings = await Customer.findOne({
			_id: user._id,
			status: 'active'
		});

		if (!accountSettings) {
			throwError(404);
		}

		accountSettings.addresses = body.addresses;
		accountSettings.save();

		updateCustomerSession(session, accountSettings);

		return accountSettings;
	} catch (error) {
		throw error;
	}
};

export const updateAddresses = async (data: any, user, session) => {
	try {
		const customer = await Customer.findOne({
			_id: user._id,
			status: 'active'
		});

		if (!customer) {
			throwError(404);
		}

		customer.addresses = data;
		await customer.save();
		return customer.addresses;
	} catch (error) {
		throw error;
	}
};
