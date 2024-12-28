import { Router } from 'express';
import { getInvoices } from '../../../controllers/seller/invoices';

const router = Router();

router.get('/:type', (req, res) => {
	res.handle(getInvoices, [req.params.type, req.query, req.getUser()], 'list');
});

export default router;
