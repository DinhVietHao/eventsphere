import { Event } from "../../events/models/event.model";
import { User } from "../../auth/models/user.model";
import { Registration } from "../../tickets/models/registration.model";
import { CheckinLogModel } from "../../checkin/models/checkinLog.model";
import mongoose from "mongoose";
import { Payment } from "../../payment/model/payment.model";

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

  // Tổng số vé đã bán (paid, status confirmed)
  async countPaidRegistrations(): Promise<number> {
    return Registration.countDocuments({
      paymentStatus: { $in: ["paid"] },
      status: "confirmed",
    });
  }

  // Tổng check-in toàn hệ thống
  async countTotalCheckins(): Promise<number> {
    return CheckinLogModel.countDocuments();
  }

  // 5 sự kiện mới nhất đang pending
  async getRecentPendingEvents() {
    return Event.find({ status: "PENDING" })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
  }

  // 5 user mới đăng ký gần nhất
  async getRecentUsers() {
    return User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name email role createdAt isActive")
      .lean();
  }

  // --- UC26: BÁO CÁO DOANH THU TOÀN NỀN TẢNG (VIEW REVENUE REPORT) ---

  async getRevenueReport(filters: any, groupBy: string) {
    const pipeline: mongoose.PipelineStage[] = [];

    // 1. MATCH - BƯỚC 1: Lọc hóa đơn đã thanh toán và theo khoảng thời gian
    const initialMatch: any = { status: "paid" };
    if (filters.startDate || filters.endDate) {
      initialMatch.paidAt = {};
      if (filters.startDate) {
        initialMatch.paidAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        initialMatch.paidAt.$lte = new Date(filters.endDate);
      }
    }

    pipeline.push({
      $match: initialMatch,
    });

    // 2. LOOKUP & UNWIND: Nối với collection 'events' để lấy category và organizerId
    pipeline.push({
      $lookup: {
        from: "events",
        localField: "eventId",
        foreignField: "_id",
        as: "event",
      },
    });
    pipeline.push({
      $unwind: "$event",
    });
    pipeline.push({
      $lookup: {
        from: "users", // Tên collection của Schema User trong DB
        localField: "event.organizerId", // Lấy ID organizer từ sự kiện
        foreignField: "_id", // So khớp với _id trong bảng user
        as: "organizerData", // Lưu kết quả vào biến organizerData
      },
    });
    // Phá mảng organizerData ra thành object (giữ lại null nếu lỡ event bị mất chủ)
    pipeline.push({
      $unwind: { path: "$organizerData", preserveNullAndEmptyArrays: true },
    });

    // 3. MATCH BƯỚC 2: Lọc theo organizerId và category (nếu có truyền lên)
    const eventMatch: any = {};
    if (filters.organizerId) {
      eventMatch["event.organizerId"] = new mongoose.Types.ObjectId(
        filters.organizerId,
      );
    }
    if (filters.category) {
      eventMatch["event.category"] = filters.category;
    }
    if (Object.keys(eventMatch).length > 0) {
      pipeline.push({
        $match: eventMatch,
      });
    }

    // 4. CHUẨN BỊ ĐIỀU KIỆN GROUP ($group _id)
    let groupId: any = null;
    switch (groupBy) {
      case "day":
        groupId = { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } };
        break;
      case "week":
        groupId = {
          year: { $isoWeekYear: "$paidAt" },
          week: { $isoWeek: "$paidAt" },
        };
        break;
      case "month":
        groupId = { $dateToString: { format: "%Y-%m", date: "$paidAt" } };
        break;
      case "organizer":
        groupId = "$organizerData.name";
        break;
      case "category":
        groupId = "$event.category";
        break;
      default:
        groupId = { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } };
    }

    // 5. GOM NHÓM VÀ TÍNH TIỀN ($group & $sum)
    pipeline.push({
      $group: {
        _id: groupId,
        totalRevenue: { $sum: "$amount" },
        totalTicketSold: { $sum: 1 },
      },
    });

    pipeline.push({
      $sort: { _id: 1 },
    });
    return Payment.aggregate(pipeline);
  }

  async getOrganizersList() {
    return User.find({ role: "organizer" }).select("_id name").lean();
  }
}

export const adminRepository = new AdminRepository();
