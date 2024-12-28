import { sendEmail } from '../../helpers/mailer';
import { throwError } from '../../helpers/throw-errors';
import config from '../../../config.json';

export const contactEmail = async (data: any) => {
	try {
		if (!data.contact || !data.email) {
			throwError(400);
		}

		await sendEmail({
			to: config.email.from,
			subject: 'Aekatra Contact Email',
			text: 'Email :' + data.email + 'Contact : ' + data.contact,
			html:
				'<p>Email : <strong>' +
				data.email +
				'</strong></p><p>Contact : <strong>' +
				data.contact +
				'</strong></p>'
		});

		return;
	} catch (error) {
		throw error;
	}
};
