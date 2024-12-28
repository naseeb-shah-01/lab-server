import { model } from 'mongoose';
import { destorySessionById, getSessionById, setSessionById } from '../../helpers/server-helper';
import { IRider } from '../../models/rider/rider';
const Rider = model<IRider>('Rider');

export const createRiderSession = (rider) => {
	const data = JSON.parse(JSON.stringify(rider));
	return {
		_id: data._id,
		status: data.status,
		kyc: data.kyc,
		kycStage: data.kycStage,
		approved: data.approved,
		updatedAt: data.updatedAt
	};
};

export const updateRiderSession = (session, rider) => {
	let sessionData = createRiderSession(rider);
	session.rider = sessionData;
	checkAndUpdateRiderSessions(rider);
};

export const checkAndUpdateRiderSessions = async (rider): Promise<IRider> => {
	const removeSessions = [];
	for (const session of rider.sessions) {
		const sessionDetails = await getSessionById(session);
		if (sessionDetails) {
			const sessionData = createRiderSession(rider);
			sessionDetails.rider = sessionData;
			setSessionById(session, sessionDetails);
		} else {
			removeSessions.push(session);
		}
	}
	if (removeSessions.length) {
		rider = await Rider.findByIdAndUpdate(
			rider._id,
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
	return rider;
};

export const removeSessions = async (rider) => {
	for (const session of rider.sessions) {
		const sessionDetails = await getSessionById(session);
		if (sessionDetails) {
			destorySessionById(session);
		}
	}
	rider = await Rider.findByIdAndUpdate(
		rider._id,
		{
			sessions: []
		},
		{
			new: true,
			useFindAndModify: false,
			timestamps: false
		}
	).lean();
	return rider;
};
