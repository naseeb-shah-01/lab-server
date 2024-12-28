import mongoose from 'mongoose';
import config from '../../config.json';
import path from 'path';

mongoose.Promise = global.Promise;
export default class Database {
    static connect() {
        return mongoose.connect(config.dbUrl, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
        });
    }

    static initModels() {
        require(path.join(__dirname, '../models'));
    }
}