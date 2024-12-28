import { model } from 'mongoose';
import { destorySessionById, getSessionById, setSessionById } from '../../helpers/server-helper';
import { ICustomer } from '../../models/customer/customer';
const Customer = model<ICustomer>('Customer');

export const createCustomerSession = (customer) => {
	const data = JSON.parse(JSON.stringify(customer));
	return {
		_id: data._id,
		status: data.status,
		register: data.register,
		registerStage: data.registerStage,
		kyc: data.kyc,
		kycStage: data.kycStage,
		approved: data.approved,
		updatedAt: data.updatedAt
	};
};

export const updateCustomerSession = (session, customer) => {
	let sessionData = createCustomerSession(customer);
	session.customer = sessionData;
	checkAndUpdateCustomerSessions(customer);
};

export const checkAndUpdateCustomerSessions = async (customer): Promise<ICustomer> => {
	const removeSessions = [];
	for (const session of customer.sessions) {
		const sessionDetails = await getSessionById(session);
		if (sessionDetails) {
			const sessionData = createCustomerSession(customer);
			sessionDetails.customer = sessionData;
			setSessionById(session, sessionDetails);
		} else {
			removeSessions.push(session);
		}
	}
	if (removeSessions.length) {
		customer = await Customer.findByIdAndUpdate(
			customer._id,
			{
				$pullAll: {
					sessions: removeSessions
				}
			},
			{
				new: true,
				useFindAndModify: false,
				timestamps: false
			}
		).lean();
	}
	return customer;
};

export const removeSessions = async (customer) => {
	for (const session of customer.sessions) {
		const sessionDetails = await getSessionById(session);
		if (sessionDetails) {
			destorySessionById(session);
		}
	}
	customer = await Customer.findByIdAndUpdate(
		customer._id,
		{
			sessions: []
		},
		{
			new: true,
			useFindAndModify: false,
			timestamps: false
		}
	).lean();
	return customer;
};
