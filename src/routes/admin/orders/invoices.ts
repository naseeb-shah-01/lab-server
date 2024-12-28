import { Router } from 'express';
import { getInvoices } from '../../../controllers/users/invoices';
const router = Router();

router.get('/', (req, res) => {
	res.handle(getInvoices, [req.query, req.getUser()], 'list');
});

export default router;
