import { Router } from 'express';
const router = Router();

import adminAuth from './admin';
import customerAuth from './customers';
import riderAuth from './rider';
import sellerAuth from './seller'
router.use('/admin', adminAuth);
router.use('/customer', customerAuth);
router.use('/rider', riderAuth);
router.use('/seller', sellerAuth);


export default router;
