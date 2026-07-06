import { Event } from "../../events/models/event.model";
import { User } from "../../auth/models/user.model";
import { RegistrationModel } from "../../tickets/models/registration.model";
import { CheckinLogModel } from "../../checkin/models/checkinLog.model";

export class AdminRepository {
  // Tổng số users theo role
  async countUsersByRole() {
    return User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
  }

  // Tổng số events theo status
  async countEventsByStatus() {
    return Event.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
  }

  // Tổng số registrations paid
  async countPaidRegistrations(): Promise<number> {
    return RegistrationModel.countDocuments({ paymentStatus: "paid" });
  }

  // Tổng check-in toàn hệ thống
  async countTotalCheckins(): Promise<number> {
    return CheckinLogModel.countDocuments();
  }

  // 5 sự kiện mới nhất đang pending
  async getRecentPendingEvents() {
    return Event.find({ status: "PENDING" })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
  }

  // 5 user mới đăng ký gần nhất
  async getRecentUsers() {
    return User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role createdAt isActive")
      .lean();
  }
}

export const adminRepository = new AdminRepository();
