import { model } from 'mongoose';
import { throwError } from '../../helpers/throw-errors';
import { ICustomer } from '../../models/customer/customer';
const Customer = model<ICustomer>('Customer');

export const verifyEmail = async (token: string) => {
    try {

        let customer = await Customer.findOne({
            verificationToken: token
        });

        if (!customer) {
            throwError(404);
        }

        await Customer.findByIdAndUpdate(customer._id, {
            $set: { verified: true }
        });
        return;

    } catch (error) {
        throw error;
    }
};