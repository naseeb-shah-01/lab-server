import path from 'path';
import { uploadOnS3 } from '../middlewares/multer';
import fs from 'fs';
import config from '../../config.json';
import puppeteer from 'puppeteer';

let s3Path =
	config.doSpaces.s3Path +
	(!config.env || config.env === 'production' ? 'production/' : 'beta/') +
	(config.pdfPath.endsWith('/')
		? config.pdfPath.slice(0, config.pdfPath.length - 1)
		: config.pdfPath);

if (config.env !== 'production' && config.env !== 'beta') {
	if (!fs.existsSync(path.join(__dirname, '../', config.uploadPath + config.pdfPath))) {
		fs.mkdirSync(path.join(__dirname, '../', config.uploadPath + config.pdfPath), {
			recursive: true
		});
	}
}
export const savePDF = async (fileBuffer, filename): Promise<string> => {
	if (fileBuffer) {
		return new Promise((resolve, reject) => {
			if (config.env === 'production' || config.env === 'beta') {
				uploadOnS3({
					Bucket: s3Path,
					Key: filename,
					Body: fileBuffer,
					ACL: 'public-read',
					CacheControl: 'no-cache',
					ContentType: 'application/pdf'
				})
					.then((url) => {
						// if (url.includes('nyc3.digitaloceanspaces.com')) {
						//     url = url.replace('nyc3.digitaloceanspaces.com', 'nyc3.cdn.digitaloceanspaces.com');
						// }
						resolve(url);
					})
					.catch((err) => {
						console.error('err', err);
					});
			} else {
				fs.writeFile(
					path.join(__dirname, '../', config.uploadPath + config.pdfPath + filename),
					fileBuffer,

					(err) => {
						if (err) {
							console.error('error ', err);
							reject(err);
							return;
						}
						let url = config.uploadsUrl + config.pdfPath + filename;
						resolve(url);
					}
				);
			}
		});
	} else {
		console.error('Create Thumb Error');
		return Promise.reject();
	}
};

export const createPDF = async (data: string) => {
	try {
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		await page.setContent(data);
		let pdf = await page.pdf({
			format: 'a4',
			printBackground: true,
			omitBackground: false
		});
		await browser.close();
		return pdf;
	} catch (error) {
		console.error('Create PDF Error ', error);
		return Promise.reject();
	}
};
