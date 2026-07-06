import nodemailer from "nodemailer";
import { appConfig } from "../../config/app.config";

export interface ISendTicketEmailParams {
  to: string;
  attendeeName: string;
  eventTitle: string;
  ticketTypeName: string;
  qrCode: string;
}

export class EmailService {
  private transporter = nodemailer.createTransport({
    host: appConfig.email.host,
    port: appConfig.email.port,
    secure: appConfig.email.port === 465,
    auth:
      appConfig.email.user && appConfig.email.password
        ? {
            user: appConfig.email.user,
            pass: appConfig.email.password,
          }
        : undefined,
  });

  async sendTicketEmail(params: ISendTicketEmailParams): Promise<void> {
    if (!appConfig.email.user || !appConfig.email.password) {
      console.warn("[EmailService] EMAIL_USER/EMAIL_PASSWORD is missing. Skip sending ticket email.");
      return;
    }

    await this.transporter.sendMail({
      from: appConfig.email.from,
      to: params.to,
      subject: `Your ticket for ${params.eventTitle}`,
      html: `
        <h2>Hello ${params.attendeeName},</h2>
        <p>Your registration for <strong>${params.eventTitle}</strong> is confirmed.</p>
        <p>Ticket type: <strong>${params.ticketTypeName}</strong></p>
        <p>Please show this QR code at check-in:</p>
        <img src="${params.qrCode}" alt="Ticket QR Code" />
      `,
    });
  }
}

export const emailService = new EmailService();
