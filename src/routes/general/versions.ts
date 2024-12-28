import { Router } from 'express';
import {
    getAllAppsVersions, getAppVersions, getAppVersion, getAppLatestVersion, addAppVersion, updateAppVersion, deleteAppVersion, deleteAppVersions, updateAppVersionStatus,
} from '../../controllers/general/versions';
const router = Router();

router.get('/', (req, res) => {
    res.handle(getAllAppsVersions);
});

router.get('/:appName', (req, res) => {
    res.handle(getAppVersions, [req.params.appName, req.query.onlyActive]);
});

router.get('/:appName/latest', (req, res) => {
    res.handle(getAppLatestVersion, req.params.appName);
});

router.get('/:appName/:versionName', (req, res) => {
    res.handle(getAppVersion, [req.params.appName, req.params.versionName]);
});

router.post('/:appName', (req, res) => {
    res.handle(addAppVersion, [req.params.appName, req.body]);
});

router.put('/:appName/:versionName', (req, res) => {
    res.handle(updateAppVersion, [req.params.appName, req.params.versionName, req.body]);
});

router.delete('/:appName', (req, res) => {
    res.handle(deleteAppVersions, req.params.appName);
});

router.delete('/:appName/:versionName', (req, res) => {
    res.handle(deleteAppVersion, [req.params.appName, req.params.versionName]);
});

router.put('/:appName/:versionName/:status', (req, res) => {
    res.handle(updateAppVersionStatus, [req.params.appName, req.params.versionName, req.params.status]);
});

export default router;