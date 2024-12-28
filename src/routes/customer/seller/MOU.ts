import { multerValidation } from './../../../middlewares/multer';
import { Router } from 'express';
import {
	generateMOU,
	getMOU,
	uploadMOU,
	validateSignature
} from './../../../controllers/seller/MOU';

const router = Router();

router.get('/generate', (req, res) => {
	res.handle(generateMOU, [req.getUser(), req.query]);
});

router.post('/upload', multerValidation(validateSignature), (req, res) => {
	res.handle(uploadMOU, [req.getUser(), req.query, req.body, req.files]);
});

router.get('/get/:sellerId', (req, res) => {
	res.handle(getMOU, req.params.sellerId);
});

export default router;
