import { Router } from 'express';
import { verifyEmail } from '../../controllers/website/verify-email';
const router = Router();

router.get('/:token', (req, res) => {
    res.handle(verifyEmail, req.params.token);
});

export default router;