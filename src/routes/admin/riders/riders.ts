import { Router } from 'express';
import {
	getReviews,
	getRiderAppDetails,
	getRiders,
	riderDetails,
	updateRider,
	updateRiderDetails,
	updateRiderMaxPerOrder,
	updateRiderStatus
} from '../../../controllers/rider/admin-rider';
import { updateRiderAvailability } from '../../../controllers/rider/rider';

const router = Router();

router.get('/', (req, res) => {
	res.handle(getRiders, req.query, 'list');
});
router.put('/update', (req, res) => {
	res.handle(updateRider, [req.body, req.getUser()]);
});
router.put('/status/:id/:status', (req, res) => {
	res.handle(updateRiderStatus, [req.params.id, req.params.status, req.getUser()]);
});
router.put('/available/:id/:available', (req, res) => {
	res.handle(updateRiderAvailability, [
		{ _id: req.params.id },
		req.params.available,
		req.getUser()
	]);
});
router.get('/details/:id', (req, res) => {
	res.handle(riderDetails, [req.params.id]);
});
router.put('/update-details', (req, res) => {
	res.handle(updateRiderDetails, [req.body, req.getUser()]);
});
router.get('/reviews-rating/:id', (req, res) => {
	res.handle(getReviews, [req.params.id, req.query, 'list']);
});
router.get('/rider-app-details', (req, res) => {
	res.handle(getRiderAppDetails, [req.query]);
});
router.put('/update-rider-max-order', (req, res) => {
	res.handle(updateRiderMaxPerOrder, [req.body]);
});
export default router;
