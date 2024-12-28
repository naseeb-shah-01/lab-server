import path from 'path';
import config from '../../config.json';
import sharp from 'sharp';
import { uploadOnS3 } from '../middlewares/multer';
import { writeFile } from 'fs';
import fetch from 'node-fetch';

let s3Path =
	config.doSpaces.s3Path +
	(!config.env || config.env === 'production' ? 'production/' : 'beta/') +
	(config.thumbPath.endsWith('/')
		? config.thumbPath.slice(0, config.thumbPath.length - 1)
		: config.thumbPath);

export const createThumb = async (fileBuffer, filename, width = 100): Promise<string> => {
	if (fileBuffer) {
		return new Promise((resolve, reject) => {
			sharp(fileBuffer)
				.resize({
					fit: sharp.fit.contain,
					width: width
				})
				.toBuffer()
				.then((data) => {
					if (config.env === 'production' || config.env === 'beta') {
						uploadOnS3({
							Bucket: s3Path,
							Key: filename,
							Body: data,
							ACL: 'public-read',
							CacheControl: 'no-cache',
							ContentType: 'application/image'
						})
							.then((url) => {
								// if (url.includes('nyc3.digitaloceanspaces.com')) {
								// 	url = url.replace(
								// 		'nyc3.digitaloceanspaces.com',
								// 		'nyc3.cdn.digitaloceanspaces.com'
								// 	);
								// }
								resolve(url);
							})
							.catch((err) => {
								console.error('err', err);
							});
					} else {
						writeFile(
							path.join(
								__dirname,
								'../',
								config.uploadPath + config.thumbPath + filename
							),
							data,
							(err) => {
								if (err) {
									reject(err);
									return;
								}
								let url = config.uploadsUrl + config.thumbPath + filename;
								resolve(url);
							}
						);
					}
				})
				.catch((err) => {
					reject(err);
					console.error('err', err);
				});
		});
	} else {
		console.error('Create Thumb Error');
		return Promise.reject();
	}
};

export const createThumbWithBuffer = async (fileUrl, defaultWidth = 200): Promise<string> => {
	try {
		let urlParts = fileUrl.split('/');
		let filename = 'thumb_' + urlParts[urlParts.length - 1];
		const response = await fetch(fileUrl);
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		if (buffer) {
			const path = await createThumb(buffer, filename, defaultWidth);
			if (path) {
				return path;
			}
		}
	} catch (err) {
		console.error(err);
	}
	return fileUrl;
};
