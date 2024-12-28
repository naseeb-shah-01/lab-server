import nodemailer from 'nodemailer';
import config from '../../config.json';

const transporter = nodemailer.createTransport({
	service: 'gmail',
	host: 'smtp.gmail.com',
	port: 465,
	auth: {
		user: config.email?.from,
		pass: config.email?.fromPassword
	}
});

export const sendEmail = async (options: nodemailer.SendMailOptions) => {
	// return Promise.resolve();
	if (config.env === 'production' || config.env === 'beta') {
		if (config.email?.from) {
			options.from = config.email.from;
			return new Promise((resolve, reject) => {
				transporter.sendMail(options, (error, info) => {
					if (error) {
						reject(error);
						return;
					}
					resolve(info);
				});
			});
		} else {
			return Promise.reject();
		}
	} else {
		Promise.resolve();
	}
};
