import { model } from 'mongoose';
import { destorySessionById, getSessionById, setSessionById } from '../../helpers/server-helper';
import { ISeller } from '../../models/customer/seller';

const Seller = model<ISeller>('NewCustomer');

export const createSellerSession = (seller) => {
	const data = JSON.parse(JSON.stringify(seller));
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

export const updateSellerSession = (session, seller) => {
	let sessionData = createSellerSession(seller);
	session.seller = sessionData;
	checkAndUpdateSellerSessions(seller);
};

export const checkAndUpdateSellerSessions = async (seller): Promise<ISeller> => {
	const removeSessions = [];
	for (const session of seller.sessions) {
		const sessionDetails = await getSessionById(session);
		if (sessionDetails) {
			const sessionData = createSellerSession(seller);
			sessionDetails.seller = sessionData;
			setSessionById(session, sessionDetails);
		} else {
			removeSessions.push(session);
		}
	}
	if (removeSessions.length) {
		seller = await Seller.findByIdAndUpdate(
			seller._id,
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
	return seller;
};

export const removeSessions = async (seller) => {
	for (const session of seller.sessions) {
		const sessionDetails = await getSessionById(session);
		if (sessionDetails) {
			destorySessionById(session);
		}
	}
	seller = await Seller.findByIdAndUpdate(
		seller._id,
		{
			sessions: []
		},
		{
			new: true,
			useFindAndModify: false,
			timestamps: false
		}
	).lean();
	return seller;
};
