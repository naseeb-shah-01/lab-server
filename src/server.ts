 require('source-map-support').install();
import 'source-map-support/register';
import express from 'express';
import * as config from '../config.json';
import {
	enableCORS,
	useBodyParser,
	useSession,
	useFlash,
	enableStaticFileServer,
	startServer,
	useMorgan,
	useEnhancedExpress,
	usePaytm,
	useAirtel,
	useWebhook
} from './helpers/server-helper';
import Database from './helpers/database';
import { initializeFirebase } from './helpers/notifications/fcm';

const app = express();
app.set('trust proxy', 1);

// use morgan logger
useMorgan(app);

// initialize firebase
initializeFirebase();

// init database
Database.initModels();

// Other middlewares
enableCORS(app);
import paytm from './routes/paytm';
import airtel from './routes/airtel';
import webhook from './routes/webhook';

usePaytm(app, paytm);
useSession(app, config.secretKey);
useFlash(app);
useBodyParser(app);
useEnhancedExpress(app);
enableStaticFileServer(app, config.assetsPath, '/assets');
enableStaticFileServer(app, config.uploadPath, '/uploads');
useAirtel(app, airtel);
useWebhook(app, webhook);
app.set('view engine', 'ejs');

// require routes
import apiRoutes from './routes';
app.use('/api', apiRoutes);

// return 404 if request URL not found
app.use((req, res) => {
	res.errorRes(404);
});

// Database Connect
import { refreshRedisData } from './helpers/redis-refresh';
import { redisClient } from './helpers/redis-helper';
import { startSocketServer } from './helpers/socket';
import { startCancelOrderSchedular } from './schedulars/cancel-order-schedular';
import { startOrderMaturitySchedular } from './schedulars/order-maturity-schedular';
// import { paytmSettlementScheduler } from './schedulars/settlementScheduler';
import { startShopStatusUpdateSchedular } from './schedulars/Shop-status-update-schedular';
// import { startProductStatusUpdater } from './schedulars/product-status-update-schedular';
import { ridersClosingSchedular } from './schedulars/ridersClosingSchedular';
import { startWhatsappMessageSchedular } from './schedulars/whatsapp-message-schedular';
import { startFcmNotificationSchedular } from './schedulars/fcm-notification-schedular';
(async () => {
	await Database.connect();

	// init redis database
	redisClient.connect();

	// start refresh redis schedular
	refreshRedisData();

	const server = startServer(app, config.server.port);
	startSocketServer(server);

	startCancelOrderSchedular();
	startOrderMaturitySchedular();
	// paytmSettlementScheduler();
	startShopStatusUpdateSchedular();
	// startProductStatusUpdater();
	ridersClosingSchedular();
	startWhatsappMessageSchedular();
	startFcmNotificationSchedular();
})();
