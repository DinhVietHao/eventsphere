import Bull from "bull";
import { appConfig } from "../../config/app.config";

export interface NotificationJobData {
  eventId: string;
  subject: string;
  message: string;
  recipients: { name: string; email: string }[];
}

// Tạo queue kết nối Redis
export const notificationQueue = new Bull<NotificationJobData>("notification", {
  redis: {
    host: appConfig.redis.host,
    port: appConfig.redis.port,
  },
});
