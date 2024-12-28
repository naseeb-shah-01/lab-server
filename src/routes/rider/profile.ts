import { Router } from 'express';
import {
	getAccountSettings,
	getMyProfile,
	updateAccountSettings,
	updateMyProfile
} from '../../controllers/rider/profile';
const router = Router();

router.get('/my-profile', (req, res) => {
	res.handle(getMyProfile, [req.getUser()]);
});

router.put('/my-profile', (req, res) => {
	res.handle(updateMyProfile, [req.body, req.getUser(), req.session]);
});

router.get('/account-settings', (req, res) => {
	res.handle(getAccountSettings, [req.getUser()]);
});

router.put('/account-settings', (req, res) => {
	res.handle(updateAccountSettings, [req.body, req.getUser(), req.session]);
});

export default router;
