import { Router } from 'express';
import {
	getRiderDetails,
	addPersonalDetails,
	updatePersonalDetails,
	addKycDocument,
	updateKycDocument,
	validateKyc,
	requestForRiderApproval,
	validateBankDetails
} from '../../controllers/rider/rider';
import { multerValidation } from '../../middlewares/multer';

const router = Router();

router.get('/', (req, res) => {
	res.handle(getRiderDetails, req.getUser());
});
router.post('/validate-bank', (req, res) => {
	res.handle(validateBankDetails, [req.body, req.getUser()]);
});

router.post('/personal-details', (req, res) => {
	res.handle(addPersonalDetails, [req.body, req.getUser()]);
});

router.put('/personal-details', (req, res) => {
	res.handle(updatePersonalDetails, [req.body, req.getUser()]);
});

router.post('/kyc-document', multerValidation(validateKyc), (req, res) => {
	res.handle(addKycDocument, [req.body, req.files, req.getUser()]);
});

router.put('/kyc-document', multerValidation(validateKyc), (req, res) => {
	res.handle(updateKycDocument, [req.body, req.files, req.getUser()]);
});

router.put('/request-for-rider', (req, res) => {
	res.handle(requestForRiderApproval, req.getUser());
});

export default router;
