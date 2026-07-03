import nodemailer from "nodemailer";
import { notificationQueue, NotificationJobData } from "./notification.queue";
import { appConfig } from "../../config/app.config";

// Tạo transporter gửi email
const transporter = nodemailer.createTransport({
  host: appConfig.email.host,
  port: appConfig.email.port,
  secure: false,
  auth: {
    user: appConfig.email.user,
    pass: appConfig.email.password,
  },
});

// Worker lắng nghe queue, xử lý từng job
notificationQueue.process(async (job) => {
  const { subject, message, recipients } = job.data as NotificationJobData;

  console.log(
    `Processing notification job ${job.id}: ${recipients.length} recipients`,
  );

  // Gửi email cho từng người — dùng Promise.all để gửi song song
  await Promise.all(
    recipients.map((recipient) =>
      transporter.sendMail({
        from: appConfig.email.from,
        to: recipient.email,
        subject: subject,
        html: `
          <h2>Xin chào ${recipient.name},</h2>
          <p>${message}</p>
          <br/>
          <small>EventSphere Notification</small>
        `,
      }),
    ),
  );

  console.log(`Job ${job.id} completed`);
});

notificationQueue.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

console.log("Notification worker started");
