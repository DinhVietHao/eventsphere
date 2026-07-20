import nodemailer from "nodemailer";
import { notificationQueue, NotificationJobData } from "./notification.queue";
import { appConfig } from "../../config/app.config";

const transporter = nodemailer.createTransport({
  host: appConfig.email.host,
  port: appConfig.email.port,
  secure: false,
  auth: {
    user: appConfig.email.user,
    pass: appConfig.email.password,
  },
});

const BATCH_SIZE = 5; // 5 email/batch - an toan voi Gmail
const BATCH_DELAY = 2000; // 2s nghi giua cac batch
const MAX_RETRIES = 3;
const BASE_DELAY = 2000; // exponential backoff: 2s, 4s, 8s

async function sendWithRetry(
  recipient: { name: string; email: string },
  subject: string,
  message: string,
  attempt = 1,
): Promise<void> {
  try {
    await transporter.sendMail({
      from: appConfig.email.from,
      to: recipient.email,
      subject: subject,
      html: `
        <h2>Xin chao ${recipient.name},</h2>
        <p>${message}</p>
        <br/>
        <small>EventSphere Notification</small>
      `,
    });
  } catch (err: any) {
    const isRetryable =
      err?.responseCode === 421 ||
      err?.responseCode === 450 ||
      err?.responseCode === 451 ||
      String(err?.message ?? "").includes("Temporary");

    if (isRetryable && attempt <= MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, attempt - 1);
      console.warn(
        `[Worker] Retry ${attempt}/${MAX_RETRIES} for ${recipient.email} in ${delay}ms — ${err.message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendWithRetry(recipient, subject, message, attempt + 1);
    }

    console.error(
      `[Worker] Failed permanently for ${recipient.email} after ${attempt - 1} retries: ${err.message}`,
    );
  }
}

notificationQueue.process(async (job) => {
  const { subject, message, recipients } = job.data as NotificationJobData;
  const total = recipients.length;
  const totalBatches = Math.ceil(total / BATCH_SIZE);

  console.log(
    `[Worker] Job ${job.id} started: ${total} recipients, ${totalBatches} batches`,
  );

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

    await Promise.all(
      batch.map((recipient) => sendWithRetry(recipient, subject, message)),
    );

    console.log(
      `[Worker] Job ${job.id}: batch ${batchIndex}/${totalBatches} done (${Math.min(i + BATCH_SIZE, total)}/${total})`,
    );

    if (i + BATCH_SIZE < total) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  console.log(`[Worker] Job ${job.id} completed — ${total} emails processed`);
});

notificationQueue.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err.message);
});

console.log("[Worker] Notification worker started");
