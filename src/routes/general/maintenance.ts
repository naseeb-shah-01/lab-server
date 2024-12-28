import { Router } from 'express';
import {
    getAppMaintenance,
    getAllAppsMaintenance,
    addAppMaintenance,
    updateAppMaintenance,
    deleteAppMaintenance,
    updateAppNameMaintenance
} from '../../controllers/general/maintenance';
const router = Router();

router.get('/', (req, res) => {
    res.handle(getAllAppsMaintenance);
});

router.get('/:appName', (req, res) => {
    res.handle(getAppMaintenance, req.params.appName);
});

router.post('/', (req, res) => {
    res.handle(addAppMaintenance, req.body);
});

router.put('/:appName', (req, res) => {
    res.handle(updateAppNameMaintenance, [req.params.appName, req.body]);
});

router.delete('/:appName', (req, res) => {
    res.handle(deleteAppMaintenance, req.params.appName);
});

router.put('/:appName/:status', (req, res) => {
    res.handle(updateAppMaintenance, [req.params.appName, req.params.status]);
});

export default router;