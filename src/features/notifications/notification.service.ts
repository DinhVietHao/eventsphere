import { IUser } from "../auth/models/user.model";
import { notificationQueue } from "./notification.queue";
import { Registration } from "../tickets/models/registration.model";
import { User } from "../auth/models/user.model";
import { AppError } from "../../shared/errors/AppError";
import { Types } from "mongoose";

export class NotificationService {
  async sendMassNotification(
    eventId: string,
    subject: string,
    message: string,
  ) {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new AppError("eventId không hợp lệ", 400);
    }

    // Lấy danh sách attendee đã paid của event
    const registrations = await Registration.find({
      eventId: new Types.ObjectId(eventId),
      paymentStatus: "paid",
    } as any).lean();

    if (registrations.length === 0) {
      throw new AppError("Không có attendee nào để gửi thông báo", 404);
    }

    // Lấy thông tin email của từng attendee
    const userIds = registrations.map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds } } as any)
      .select("name email")
      .lean();

    const recipients = users.map((u: Partial<IUser>) => ({
      name: u.name!,
      email: u.email!,
    }));

    // Đưa job vào queue — không chờ xử lý xong
    await notificationQueue.add({ eventId, subject, message, recipients });

    return {
      queued: true,
      totalQueued: recipients.length,
    };
  }
}

export const notificationService = new NotificationService();
