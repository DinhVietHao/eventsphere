import { IUser } from "../auth/models/user.model";
import { notificationQueue } from "./notification.queue";
import { Registration } from "../tickets/models/registration.model";
import { User } from "../auth/models/user.model";
import { AppError } from "../../shared/errors/AppError";
import { Types } from "mongoose";
import { NotificationLog } from "./notification.model";
import { Event } from "../events/models/event.model";

export class NotificationService {
  async sendMassNotification(
    eventId: string,
    subject: string,
    message: string,
    organizerId: string,
  ) {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new AppError("eventId không hợp lệ", 400);
    }

    // Lấy tên sự kiện để lưu vào log
    const event = await Event.findById(eventId).select("title").lean();
    if (!event) throw new AppError("Sự kiện không tồn tại", 404);

    // Lấy danh sách attendee đã paid của event
    const registrations = await Registration.find({
      eventId: new Types.ObjectId(eventId),
      paymentStatus: { $in: ["paid", "free"] },
      status: "confirmed",
    } as any).lean();

    if (registrations.length === 0) {
      throw new AppError("Không có attendee nào để gửi thông báo", 404);
    }

    // Lấy thông tin email của từng attendee
    const userIds = registrations.map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds } } as any)
      .select("name email")
      .lean();

    console.log("Registrations:", registrations.length);
    console.log("UserIds:", userIds.length);

    const uniqueUserIds = new Set(userIds.map(String));
    console.log("Unique userIds:", uniqueUserIds.size);

    console.log("Users found:", users.length);

    const recipients = users.map((u: Partial<IUser>) => ({
      name: u.name!,
      email: u.email!,
    }));

    // Đưa job vào queue — không chờ xử lý xong
    await notificationQueue.add({ eventId, subject, message, recipients });

    // Lưu lịch sử gửi
    await NotificationLog.create({
      organizerId: new Types.ObjectId(organizerId),
      eventId: new Types.ObjectId(eventId),
      eventTitle: event.title,
      subject,
      totalQueued: recipients.length,
    });

    return {
      queued: true,
      totalQueued: recipients.length,
    };
  }

  // Lấy 10 lần gửi gần nhất của organizer
  async getSentHistory(organizerId: string) {
    return NotificationLog.find({
      organizerId: new Types.ObjectId(organizerId),
    })
      .sort({ sentAt: -1 })
      .limit(10)
      .lean();
  }
}

export const notificationService = new NotificationService();
