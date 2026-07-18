import nodemailer from "nodemailer";
import { appConfig } from "../../config/app.config";

export interface ISendTicketEmailParams {
  to: string;
  attendeeName: string;
  eventTitle: string;
  ticketTypeName: string;
  qrCode: string;
}

export interface ISendEventApprovedEmailParams {
  organizerEmail: string;
  organizerName: string;
  eventTitle: string;
  reviewedAt: Date;
}

export interface ISendEventRejectedEmailParams {
  organizerEmail: string;
  organizerName: string;
  eventTitle: string;
  rejectionReason: string;
  editEventUrl?: string;
}

export interface ISendAccountLockedEmailParams {
  recipientEmail: string;
  recipientName: string;
  reason: string;
  lockedAt: Date;
  supportEmail?: string;
}

export interface ISendAccountUnlockedEmailParams {
  recipientEmail: string;
  recipientName: string;
  unlockedAt: Date;
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

  /**
   * Sends the organizer notification after an event is approved.
   */
  async sendEventApprovedEmail(params: ISendEventApprovedEmailParams): Promise<void> {
    if (!appConfig.email.user || !appConfig.email.password) {
      console.warn("[EmailService] EMAIL_USER/EMAIL_PASSWORD is missing. Skip sending event approved email.");
      return;
    }

    const organizerName = this.escapeHtml(params.organizerName);
    const eventTitle = this.escapeHtml(params.eventTitle);
    const reviewedAt = params.reviewedAt.toLocaleString("vi-VN");

    await this.transporter.sendMail({
      from: appConfig.email.from,
      to: params.organizerEmail,
      subject: `Sự kiện “${params.eventTitle}” đã được phê duyệt`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <p>Xin chào ${organizerName},</p>
          <p>Chúc mừng bạn!</p>
          <p>Sự kiện <strong>“${eventTitle}”</strong> đã được quản trị viên phê duyệt và hiện có thể được hiển thị cho người tham dự.</p>
          <p><strong>Thời gian duyệt:</strong> ${reviewedAt}</p>
          <p>Trân trọng,<br/>EventSphere Team</p>
        </div>
      `,
    });
  }

  /**
   * Sends the organizer notification after an event is rejected.
   */
  async sendEventRejectedEmail(params: ISendEventRejectedEmailParams): Promise<void> {
    if (!appConfig.email.user || !appConfig.email.password) {
      console.warn("[EmailService] EMAIL_USER/EMAIL_PASSWORD is missing. Skip sending event rejected email.");
      return;
    }

    const organizerName = this.escapeHtml(params.organizerName);
    const eventTitle = this.escapeHtml(params.eventTitle);
    const rejectionReason = this.escapeHtml(params.rejectionReason).replace(/\n/g, "<br/>");
    const editLink = params.editEventUrl
      ? `<p>Bạn có thể chỉnh sửa sự kiện tại: <a href="${this.escapeHtml(params.editEventUrl)}">${this.escapeHtml(params.editEventUrl)}</a></p>`
      : "";

    await this.transporter.sendMail({
      from: appConfig.email.from,
      to: params.organizerEmail,
      subject: `Kết quả xét duyệt sự kiện “${params.eventTitle}”`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <p>Xin chào ${organizerName},</p>
          <p>Sự kiện <strong>“${eventTitle}”</strong> hiện chưa được phê duyệt.</p>
          <p><strong>Lý do:</strong></p>
          <p style="padding:12px;background:#f8fafc;border-left:4px solid #dc3545">${rejectionReason}</p>
          <p>Sự kiện đã được chuyển về trạng thái bản nháp. Bạn có thể chỉnh sửa nội dung và gửi xét duyệt lại.</p>
          ${editLink}
          <p>Trân trọng,<br/>EventSphere Team</p>
        </div>
      `,
    });
  }

  async sendAccountLockedEmail(params: ISendAccountLockedEmailParams): Promise<void> {
    if (!appConfig.email.user || !appConfig.email.password) {
      console.warn("[EmailService] EMAIL_USER/EMAIL_PASSWORD is missing. Skip sending account locked email.");
      return;
    }

    const recipientName = this.escapeHtml(params.recipientName);
    const reason = this.escapeHtml(params.reason).replace(/\n/g, "<br/>");
    const lockedAt = params.lockedAt.toLocaleString("vi-VN");
    const supportLine = params.supportEmail
      ? `<p>Email ho tro: <a href="mailto:${this.escapeHtml(params.supportEmail)}">${this.escapeHtml(params.supportEmail)}</a></p>`
      : "";

    await this.transporter.sendMail({
      from: appConfig.email.from,
      to: params.recipientEmail,
      subject: "Tai khoan EventSphere cua ban da bi khoa",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <p>Xin chao ${recipientName},</p>
          <p>Tai khoan EventSphere cua ban da bi quan tri vien khoa.</p>
          <p><strong>Ly do:</strong></p>
          <p style="padding:12px;background:#f8fafc;border-left:4px solid #dc3545">${reason}</p>
          <p><strong>Thoi gian khoa:</strong> ${lockedAt}</p>
          <p>Trong thoi gian tai khoan bi khoa, ban se khong the dang nhap hoac su dung cac chuc nang yeu cau xac thuc.</p>
          <p>Neu ban cho rang day la nham lan, vui long lien he bo phan ho tro.</p>
          ${supportLine}
          <p>Tran trong,<br/>EventSphere Team</p>
        </div>
      `,
    });
  }

  async sendAccountUnlockedEmail(params: ISendAccountUnlockedEmailParams): Promise<void> {
    if (!appConfig.email.user || !appConfig.email.password) {
      console.warn("[EmailService] EMAIL_USER/EMAIL_PASSWORD is missing. Skip sending account unlocked email.");
      return;
    }

    const recipientName = this.escapeHtml(params.recipientName);
    const unlockedAt = params.unlockedAt.toLocaleString("vi-VN");

    await this.transporter.sendMail({
      from: appConfig.email.from,
      to: params.recipientEmail,
      subject: "Tai khoan EventSphere cua ban da duoc mo khoa",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <p>Xin chao ${recipientName},</p>
          <p>Tai khoan EventSphere cua ban da duoc mo khoa va co the su dung binh thuong.</p>
          <p><strong>Thoi gian mo khoa:</strong> ${unlockedAt}</p>
          <p>Ban co the dang nhap lai vao he thong.</p>
          <p>Tran trong,<br/>EventSphere Team</p>
        </div>
      `,
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export const emailService = new EmailService();
