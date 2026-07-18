import Bull from "bull";
import { appConfig } from "../../config/app.config";

export interface NotificationJobData {
  eventId: string;
  subject: string;
  message: string;
  recipients: { name: string; email: string }[];
}

const redisConnection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : { host: appConfig.redis.host, port: appConfig.redis.port };

export const notificationQueue = new Bull<NotificationJobData>("notification", {
  redis: redisConnection,
});
