import { model } from 'mongoose';
import { throwError } from '../../helpers/throw-errors';
import { IRider } from '../../models/rider/rider';
import { updateRiderSession } from './session';
const Rider = model<IRider>('Rider');

export const getMyProfile = async (user) => {
	try {
		const profile = await Rider.findOne({
			_id: user._id,
			status: 'active'
		})
			.select('avatar profilePhoto name email contact bankDetails panCardDetails')
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
		const profile = await Rider.findOne({
			_id: user._id,
			status: 'active'
		});

		if (!profile) {
			throwError(404);
		}

		const existingContactDelivery = await Rider.findOne({
			_id: { $ne: user._id },
			contact: body.contact.trim()
		});

		if (existingContactDelivery) {
			throwError(409);
		}

		profile.email = body.email;
		profile.contact = body.contact;
		profile.name = body.name;

		profile.save();
		updateRiderSession(session, profile);
		const data = profile.toJSON();
		delete data.sessions;
		return data;
	} catch (error) {
		throw error;
	}
};

export const getAccountSettings = async (user) => {
	try {
		const accountSettings = await Rider.findOne({
			_id: user._id,
			status: 'active'
		})
			.select('addresses bankDetails panCardDetails drivingLicenseDetails')
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
		// const billingIndex = body.addresses.findIndex((a) => a.billing === true);
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
		if (primaryIndex === -1 || invalidAddressIndex >= 0) {
			throwError(400);
		}
		const accountSettings = await Rider.findOne({
			_id: user._id,
			status: 'active'
		});

		if (!accountSettings) {
			throwError(404);
		}

		accountSettings.addresses = body.addresses;
		accountSettings.bankDetails = body.bankDetails;
		accountSettings.panCardDetails = body.panCardDetails;
		accountSettings.drivingLicenseDetails = body.drivingLicenseDetails;
		// accountSettings.vacation = body.vacation;
		accountSettings.save();

		updateRiderSession(session, accountSettings);

		return accountSettings;
	} catch (error) {
		throw error;
	}
};

export const updateAddresses = async (data: any, user, session) => {
	try {
		const rider = await Rider.findOne({
			_id: user._id,
			status: 'active'
		});

		if (!rider) {
			throwError(404);
		}

		rider.addresses = data;
		await rider.save();
		return rider.addresses;
	} catch (error) {
		throw error;
	}
};
