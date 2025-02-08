import { Router } from 'express';
import { createReport, getReport, updateReport } from '../../../controllers/report';

const router = Router();

router.post('/create', (req, res) => {
	res.handle(createReport, req.body);
});
router.get('/update', (req, res) => {
	res.handle(updateReport, req.body);
});
router.get('/:id', (req, res) => {
	res.handle(getReport, req.params.id);
});

export default router;
