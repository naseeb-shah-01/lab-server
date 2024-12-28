import redis, { RedisClient } from 'redis';
import config from '../../config.json';

export var _redisConn: RedisClient = null;

export const redisClient = {
    connect: () => {
        if (!_redisConn) {
            _redisConn = redis.createClient({
                url: config.redisUrl
            });
        }
    },
    getConnection: () => _redisConn,
    get: (key) => {
        return new Promise<any>((resolve, reject) => {
            _redisConn.get(config.redisPrefix + key, (error, value) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(JSON.parse(value));
                }
            });
        });
    },
    set: (key, value) => {
        return new Promise<any>((resolve, reject) => {
            _redisConn.set(config.redisPrefix + key, JSON.stringify(value), (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(JSON.parse(JSON.stringify(value)));
                }
            });
        });
    },
    del: (key) => {
        return new Promise<any>((resolve, reject) => {
            _redisConn.del(config.redisPrefix + key, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(null);
                }
            })
        })
    },
    keys: (pattern: string): Promise<string[]> => {
        return new Promise((resolve, reject) => {
            _redisConn.keys(pattern, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }
};
