import { Router } from 'express';
import { sendLoginOtp, verifyLoginOtp, renewUser, logoutUser } from '../../controllers/auth/admin';
const router = Router();

router.post('/otp/send', (req, res) => {
    res.handle(sendLoginOtp, req.body.contact);
});

router.post('/otp/verify', (req, res) => {
    res.removeHeader('RENEW_USER');
    res.handle(verifyLoginOtp, [req.body, req.session, req.sessionID]);
});

router.get('/renew', (req, res) => {
    res.removeHeader('RENEW_USER');
    res.handle(renewUser, [req.session]);
})

router.post('/logout', (req, res) => {
    res.handle(logoutUser, [req.session, req.sessionID]);
});
export default router;