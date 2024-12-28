import { Router } from 'express';
import { contactEmail } from '../../controllers/website/contact';
const router = Router();

router.post('/', (req, res) => {
    res.handle(contactEmail, req.body);
});

export default router;