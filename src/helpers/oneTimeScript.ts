import mongoose from 'mongoose';
import config from '../../config.json';
import path from 'path';
import LocationModel from '../models/seller/location';

export async function connect() {
	try {
		await mongoose.connect(config.dbUrl, {
			useNewUrlParser: true,
			useCreateIndex: true,
			useUnifiedTopology: true
		});
		
		const location = new LocationModel({
			address: 'Sector 75',
			city: 'Noida',
			state: 'Uttar Pradesh',
			country: 'India',
			zip: '201301'
		});
		location.save();

		
	} catch (err) {
		
	}
}
