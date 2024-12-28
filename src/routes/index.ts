import { Router } from 'express';

import { checkAccessKey } from '../middlewares/access-key';

import auth from './auth';
import admin from './admin';
import website from './website';
import customer from './customer';
import rider from './rider';
import maintenance from './general/maintenance';
import versions from './general/versions';
import { withoutAuth, withAuth } from '../middlewares/common';

const router = Router();

// All Routes
router.use('/auth', withoutAuth(), auth);
router.use('/website', website);
router.use('/admin', withAuth(), admin);
router.use('/customer',  customer);

router.use('/rider', withAuth(), rider);

// Maintenance Check Route
router.use('/check-maintenance', withoutAuth(), (req, res) => {
	res.status(200).json({});
});

// Maintenance and Versioning Administration Routes
router.use('/maintenance', checkAccessKey, maintenance);
router.use('/versions', checkAccessKey, versions);

export default router;
