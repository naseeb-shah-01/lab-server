import config from '../../config.json';
import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction, Router, RequestHandler } from 'express';
import log from './../helpers/logger';

import AWS from 'aws-sdk';
import multerS3 from 'multer-s3';

AWS.config.update({
	accessKeyId: config.doSpaces.accessKeyId,
	secretAccessKey: config.doSpaces.secretAccessKey
});
const spacesEndpoint = new AWS.Endpoint(config.doSpaces.endpoint);
const s3 = new AWS.S3({
	endpoint: config.doSpaces.endpoint
});
let s3Path =
	config.doSpaces.s3Path + (!config.env || config.env === 'production' ? 'production' : 'beta');

const s3Storege = multerS3({
	s3: s3,
	bucket: s3Path,
	acl: 'public-read',
	contentType: multerS3.AUTO_CONTENT_TYPE,
	CacheControl: 'no-cache',
	metadata: function (req, file, cb) {
		cb(null, { fieldName: file.fieldname });
	},
	key: function (req, file, cb) {
		req.originalName = Date.now() + '-' + file.originalname;
		cb(null, req.originalName);
	}
});

const storage = multer.diskStorage({
	destination: path.join(__dirname, '../', config.uploadPath),
	filename: (req, file, cb) => {
		let filename = file.originalname.toString();
		let name = filename.substring(0, filename.lastIndexOf('.'));
		name = name.trim().replace(/\s/g, '_').substr(0, 15).toLowerCase();
		let ext = filename.substring(filename.lastIndexOf('.'), filename.length);
		cb(null, name + '-' + Date.now() + ext);
	}
});

const formDatatoJSON = (req) => {
	if (req.get('Content-Type') && !!req.get('Content-Type').includes('multipart/form-data')) {
		if (req.body && req.body.data) {
			if (typeof req.body.data === 'string') {
				try {
					return JSON.parse(req.body.data);
				} catch (error) {
					log.error('Cannot parse multipart body : ', error);
				}
			} else {
				return req.body.data;
			}
		}
	}
	return req.body;
};

export const useMultipart = (req: Request, res: Response, next: NextFunction) => {
	req.body = formDatatoJSON(req);
	next();
};

const generateValidatorFn = (res: Response, validatorFn?: Function) => {
	return (req: Request, file, cb) => {
		if (validatorFn) {
			if (!req.validationCompleted) {
				validatorFn(
					req,
					res,
					formDatatoJSON(req),
					(result) => {
						req.validationCompleted = true;
						req.validationResult = !!result;
						cb(null, !!result);
					},
					file
				);
			} else {
				cb(null, !!req.validationResult);
			}
		} else {
			cb(null, true);
		}
	};
};

export const multerValidation = function (validatorFn?: Function) {
	return [
		(req, res, next) => {
			if (config.env === 'production' || config.env === 'beta') {
				multer({
					storage: s3Storege,
					fileFilter: generateValidatorFn(res, validatorFn)
				}).any()(req, res, next);
			} else {
				multer({
					storage: storage,
					fileFilter: generateValidatorFn(res, validatorFn)
				}).any()(req, res, next);
			}
		},
		(req, res, next) => {
			if (config.env === 'dev' && req.files && req.files.length) {
				for (let file of req.files as any[]) {
					file.location = config.uploadsUrl + file.filename;
				}
			} else {
				for (let file of req.files as any[]) {
					// if (file.location.includes('nyc3.digitaloceanspaces.com/' + config.doSpaces.s3Path.replace('/', '') + '/') && !file.location.includes(config.doSpaces.s3Path.replace('/', '') + '.nyc3')) {
					//     file.location = 'https://' + config.doSpaces.s3Path.replace('/', '') + '.nyc3.cdn.digitaloceanspaces.com/'.concat(file.location.split('nyc3.digitaloceanspaces.com/' + config.doSpaces.s3Path.replace('/', '') + '/')[1]);
					// }
					// if (file.location.includes('nyc3.digitaloceanspaces.com')) {
					//     file.location = file.location.replace('nyc3.digitaloceanspaces.com', 'nyc3.cdn.digitaloceanspaces.com');
					// }
					if (file.location.includes('+')) {
						file.location = file.location.replace(/\+/g, '%20');
					}
				}
			}
			if (req.validationResult === false) {
				return;
			} else if (req.validationResult === true) {
				next();
			} else {
				validatorFn(req, res, formDatatoJSON(req), (result) => {
					req.validationCompleted = true;
					req.validationResult = !!result;
					if (!!result) {
						next();
					} else {
						return;
					}
				});
			}
		},
		useMultipart
	];
};

export const multerExcelValidation = multer({ storage: storage });

export const uploadOnS3 = (params) => {
	return new Promise<string>((resolve, reject) => {
		s3.upload(params, (error, data) => {
			if (error) {
				reject(error);
			} else {
				resolve(data.Location);
			}
		});
	});
};

export const deleteOnS3 = (params) => {
	return new Promise((resolve, reject) => {
		s3.deleteObject(params, (error, data) => {
			if (error) {
				reject(error);
			} else {
				resolve(data);
			}
		});
	});
};
