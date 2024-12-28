import { Router } from 'express';
import {
	closeIssueAndUpdateRemark,
	sendPersonalMessageWhatsapp,
	storeWhatsappMessages,
	updateAgentName,
	verifyCallBackUrl
} from '../../controllers/webhook/webhook';
import { sendWhatsAppMessageFinal } from '../../controllers/users/dashboard';
import {
	filterCustomerByCriteria,
	getAllScheduleMsg,
	messageDetails,
	saveScheduledMessage,
	sendTestMessage,
	updateScheduleMsg,
	updateStatus
} from '../../controllers/webhook/schedulingWhatsapp';

const router = Router();

router.get('/webhook', (req, res) => {
	res.handle(verifyCallBackUrl, [req, res]);
});

router.post('/webhook', (req, res) => {
	res.handle(storeWhatsappMessages, [req, res]);
});

router.post('/send-whatsapp-message-customer', (req, res) => {
	res.handle(sendWhatsAppMessageFinal, [req.body, res]);
});

router.post('/send-service-message', (req, res) => {
	res.handle(sendPersonalMessageWhatsapp, [req.body, res]);
});
router.put('/update-agent-name', (req, res) => {
	res.handle(updateAgentName, [req.body, res]);
});
router.post('/close-issue', (req, res) => {
	res.handle(closeIssueAndUpdateRemark, [req.body, res]);
});

router.post('/send-test-message', (req, res) => {
	res.handle(sendTestMessage, [req.body]);
});
router.post('/save-scheduled-message', (req, res) => {
	res.handle(saveScheduledMessage, [req.body]);
});
router.post('/filter-customer-count', (req, res) => {
	res.handle(filterCustomerByCriteria, [
		req.body.filterBy,
		req.body.dateRange,
		req.body.foodOrders,
		req.body.deliveredOrders,
		req.body.area
	]);
});

router.get('/get-scheduled-message', (req, res) => {
	res.handle(getAllScheduleMsg, req.query, 'list');
});
router.put('/update-message-status/:id/:status', (req, res) => {
	res.handle(updateStatus, [req.params.id, req.params.status]);
});
router.get('/message-details/:id', (req, res) => {
	res.handle(messageDetails, [req.params.id]);
});
router.post('/update-scheduled-message', (req, res) => {
	res.handle(updateScheduleMsg, [req.body]);
});

export default router;
