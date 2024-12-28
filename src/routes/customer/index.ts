import { Router } from 'express';
const router = Router();

import seller from './seller/seller';
import buyer from './buyer';

router.use('/seller', seller);
router.use('/buyer', buyer);

export default router;
