import { Router } from 'express';
import { airtelKey } from '../../../config.json';
import { model } from 'mongoose';

import { sendRiderNotification } from '../../helpers/notifications/notification';
import { throwError } from '../../helpers/throw-errors';
import { IRider } from '../../models/rider/rider';
import { createRiderNotification } from '../../helpers/notifications/rider';
const Rider = model<IRider>('Rider');
const router = Router();
router.post('/details', async (req, res) => {
	let { contact, fiveChar, key } = req.body;

	if (!contact) {
		res.customErrorRes(401, 'Contact not found');
		return;
	}

	if (!fiveChar) {
		res.customErrorRes(401, 'Five Char not Found ');
		return;
	}

	if (!key) {
		res.customErrorRes(401, 'Key not Found');
		return;
	}

	if (key !== airtelKey) {
		res.customErrorRes(401, 'Not authorized');
		return;
	}

	let rider = await Rider.findOne({ contact: contact })
		.select('name contact createdAt floatingCash')
		.lean();

	if (!rider) {
		res.customErrorRes(401, 'Rider Detail Mismatched');
		return; // exit the function if there's no matching rider
	}

	let fiveCharValid = rider?._id?.toString().slice(-5) == fiveChar;

	if (!fiveCharValid) {
		res.customErrorRes(401, 'Rider Detail Mismatched');
		return; // exit the function if the rider ID doesn't match the fiveChar parameter
	}

	res.status(200).send({ ...rider, fiveChar }); // send the final response if no errors occurred
});

router.post('/cash', async (req, res) => {
	let { id, amount, key, name, contact, createdAt, txnToken } = req.body;
	if (!id) {
		res.customErrorRes(401, 'Rider Id not found');
		return;
	}
	if (!name) {
		res.customErrorRes(401, 'Name not Found ');
		return;
	}
	if (!contact) {
		res.customErrorRes(401, 'Contact not Found ');
		return;
	}
	if (!key) {
		res.customErrorRes(401, 'Key not Found');
		return;
	}
	if (!createdAt) {
		res.customErrorRes(401, 'CreatedAt not Found');
		return;
	}
	if (!amount) {
		res.customErrorRes(401, 'Amount not Found');
		return;
	}
	if (key !== airtelKey) {
		res.customErrorRes(401, 'Not authorized');
		return;
	}
	if (!txnToken) {
		res.customErrorRes(401, 'Transaction token not Found');
		return;
	}

	let rider = await Rider.findOne({
		_id: id,
		name: name,
		contact: contact,
		createdAt: createdAt
	});
	if (!rider) {
		res.customErrorRes(401, 'Rider Detail Mismatched');
		return;
	}

	if (rider?.floatingCash < amount) {
		res.customErrorRes(401, 'Deposited amount exceeds floating cash. Enter lower amount.');
		return;
	}
	let updatedCash = +rider.floatingCash - amount;
	rider.floatingCash = updatedCash;
	if (rider.codBlock) {
		rider.codBlock = null;
	}
	const riderNotification = createRiderNotification(
		'ON_RIDER_SUBMIT_FLOATING_CASH',
		rider._id.toString(),

		amount
	);
	sendRiderNotification(riderNotification);
	await rider.save();

	res.status(200).send({
		status: 'success',
		msg: 'cash updated successfully'
	});
});
export default router;
