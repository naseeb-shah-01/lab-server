import {
	Application,
	Request,
	Response,
	NextFunction,
	static as ExpressStatic,
	Router
} from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import flash from 'express-flash-messages';
import morgan from 'morgan';
import config from '../../config.json';
import log from './logger';
import enhance from '@cloudedots/enhanced-express';
import { enhanceExpressRequest } from '../helpers/enhance-express';
import redis from 'redis';
import RedisTokenStore from '@cloudedots/redis-token-store';
import session from '@cloudedots/express-session-token';

const ttl = 1500 * 24 * 60 * 60;
const redisClient = redis.createClient({
	url: config.redisUrl
});
export const sessionStore = new RedisTokenStore({
	client: redisClient,
	prefix: 'aekatra-token-sess:',
	ttl: ttl
});

export const getSessionById = (sessionId): Promise<any> => {
	return new Promise((resolve, reject) => {
		sessionStore.get(sessionId, (error, session) => {
			resolve(session);
		});
	});
};

export const setSessionById = (sessionId, sessionData): Promise<void> => {
	return new Promise((resolve, reject) => {
		sessionStore.set(sessionId, sessionData, (error) => {
			resolve();
		});
	});
};

export const destorySessionById = (sessionId): Promise<void> => {
	return new Promise((resolve, reject) => {
		sessionStore.destroy(sessionId, (error) => {
			resolve();
		});
	});
};

export const startServer = (expressInstance: Application, port) => {
	return expressInstance.listen(port, () => {
		log.debug('App listening on port : ', port);
	});
};

export const enableCORS = (expressInstance: Application) => {
	expressInstance.use((req: Request, res: Response, next: NextFunction) => {
		res.setHeader(
			'Access-Control-Allow-Origin',
			req.headers && req.headers.origin ? req.headers.origin : '*'
		);
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header(
			'Access-Control-Allow-Headers',
			'Origin, X-Requested-With, Content-Type, Accept, Cache-Control, Authorization, timeZone, APP_NAME, APP_VERSION, USER_UPDATED_AT'
		);
		res.header(
			'Access-Control-Expose-Headers',
			'APP_NAME, APP_VERSION, USER_UPDATED_AT, ' +
				'MAINTENANCE, VERSION_EXPIRED, UPDATE_AVAILABLE, NEW_VERSION, NEW_VERSION_DESC, RENEW_USER, SESSION_EXPIRED, FORBIDDEN, USER_UPDATED_AT_REQUIRED'
		);
		res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		next();
	});

	expressInstance.options('*', (req, res) => {
		res.status(201).send();
	});
};

export const useBodyParser = (expressInstance: Application) => {
	expressInstance.use(
		bodyParser.urlencoded({
			extended: true
		})
	);
	expressInstance.use(
		bodyParser.json({
			limit: '100mb'
		})
	);
};

export const useEnhancedExpress = (expressInstance: Application) => {
	expressInstance.use(
		enhance({
			logger: log
		})
	);
	enhanceExpressRequest(expressInstance);
};

export const enableStaticFileServer = (
	expressInstance: Application,
	folderName: string,
	route: string
) => {
	expressInstance.use(route, ExpressStatic(path.join(__dirname, '../', folderName)));
};

export const useSession = (expressInstance: Application, secretKey: string) => {
	expressInstance.use(
		session({
			store: sessionStore,
			maxAge: ttl * 1000
		})
	);
};

export const useFlash = (expressInstance: Application) => {
	expressInstance.use(flash());
};

export const parseFormData = (obj: any) => {
	for (const key in obj) {
		if (obj[key] instanceof Array) {
			for (let i = 0; i <= obj[key].length; i++) {
				obj[key][i] = parseFormData(obj[key][i]);
			}
		} else {
			if (obj[key] === '' || obj[key] === 'null') {
				obj[key] = null;
			}
		}
	}
	return JSON.parse(JSON.stringify(obj));
};

export const useMorgan = (expressInstance: Application) => {
	expressInstance.use(
		morgan('tiny', {
			// skip: function (req, res) {
			// 	return res.statusCode < 400;
			// }
		})
	);
};

export const usePaytm = (app: Application, paytmRouter: Router) => {
	app.use(
		'/api/paytm_endpoint',
		bodyParser.json({
			limit: '100mb',
			verify: (req, res, buf) => {
				(req as any).rawBody = buf.toString();
			}
		}),
		paytmRouter
	);
};
export const useAirtel = (app: Application, airtelRouter: Router) => {
	app.use(
		'/api/airtel_endpoint',
		bodyParser.json({
			limit: '100mb',
			verify: (req, res, buf) => {
				(req as any).rawBody = buf.toString();
			}
		}),
		airtelRouter
	);
};
export const useWebhook = (app: Application, webhookRouter: Router) => {
	app.use(
		'/api/webhook_endpoint',
		bodyParser.json({
			limit: '100mb',
			verify: (req, res, buf) => {
				(req as any).rawBody = buf.toString();
			}
		}),
		webhookRouter
	);
};
