import { request, Application } from 'express';

declare global {
	namespace Express {
		interface Request {
			flash(type: any, message: any): any;
			validationCompleted: boolean;
			validationResult: boolean;
			rawBody: string;
		}
	}
}

export const enhanceExpressRequest = (expressInstance: Application) => {
	expressInstance.use((req, res, next) => {
		req.getUser = function () {
            if ((req.baseUrl + req.path).startsWith('/api/customer/seller')) {
				return req.session && req.session.seller;
			}
			else if ((req.baseUrl + req.path).startsWith('/api/admin')) {
				return req.session && req.session.adminUser;
			} else if ((req.baseUrl + req.path).startsWith('/api/customer')) {
				return req.session && req.session.customer;
			} else if ((req.baseUrl + req.path).startsWith('/api/rider')) {
				return req.session && req.session.rider;
			}
            else {
				return null;
			}
		};
		next();
	});
};
