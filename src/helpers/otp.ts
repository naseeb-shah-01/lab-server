import crypto from 'crypto';

export const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000);
}

export const generateOTPToken = () => {
    return crypto.randomBytes(25).toString('hex');
};