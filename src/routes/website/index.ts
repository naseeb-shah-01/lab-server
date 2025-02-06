import { Router } from 'express';
const router = Router();

import contact from './contact';
// import verifyEMail from './verify-email';

router.use('/contact', contact);
// router.use('/verify-email', verifyEMail);


export default router;