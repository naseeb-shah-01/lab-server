import { Router } from 'express';
const router = Router();


import buyer from './buyer';

// router.use('/seller', seller);
router.use('/buyer', buyer);

export default router;
