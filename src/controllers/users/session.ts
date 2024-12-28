import { model, Types } from 'mongoose';
import { destorySessionById, getSessionById, setSessionById } from '../../helpers/server-helper';
import { IUser } from '../../models/user/user';
const User = model<IUser>('User');
const ObjectId = Types.ObjectId;

const getUserSessionIds = async (userId: string) => {
    let user = await User.findById(userId, 'sessions');
    return user.sessions || [];
}

export const createUserSession = (user) => {
    const data = JSON.parse(JSON.stringify(user));
    return {
        _id: data._id,
        status: data.status,
        updatedAt: data.updatedAt,
    };
}

export const checkAndUpdateSessions = async (user): Promise<IUser> => {
    const removeSessions = [];
    for (const session of user.sessions) {
        const sessionDetails = await getSessionById(session);
        if (sessionDetails) {
            const sessionData = createUserSession(user);
            sessionDetails.adminUser = sessionData;
            setSessionById(session, sessionDetails);
        } else {
            removeSessions.push(session);
        }
    }
    if (removeSessions.length) {
        user = await User.findByIdAndUpdate(user._id, {
            $pullAll: {
                sessions: removeSessions
            }
        }, {
            new: true, useFindAndModify: false, timestamps: false
        }).lean();
    }
    return user;
};

export const removeSessions = async (user) => {
    for (const session of user.sessions) {
        const sessionDetails = await getSessionById(session);
        if (sessionDetails) {
            destorySessionById(session);
        }
    }
    user = await User.findByIdAndUpdate(user._id, {
        sessions: []
    }, {
        new: true, useFindAndModify: false, timestamps: false
    }).lean();
    return user;
};