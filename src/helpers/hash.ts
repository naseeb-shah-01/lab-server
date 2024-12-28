import * as config from '../../config.json';
import { createHmac } from 'crypto';

export const hashPassword = (password) => {
    const hashedPassword = createHmac('sha256', config.secretKey)
        .update(password)
        .digest('hex');
    return hashedPassword;
};

export const verifyPassword = (password, hash) => {
    const passwordHash = hashPassword(password);
    return passwordHash === hash;
};
