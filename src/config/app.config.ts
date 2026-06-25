import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const appConfig = {
  port             : parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv          : process.env.NODE_ENV ?? 'development',
  mongoUri         : process.env.MONGO_URI ?? 'mongodb://localhost:27017/eventsphere',
  jwtAccessSecret  : process.env.JWT_ACCESS_SECRET  ?? 'dev_access_secret',
  jwtAccessExpires : process.env.JWT_ACCESS_EXPIRES  ?? '15m',
  jwtRefreshSecret : process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
};