// Khung code xử lý logic cho Event UCs// src/features/events/events.service.ts
import { AppError } from "../../shared/errors/AppError";
import { eventRepository } from "./repositories/event.repository";
import { EventReportDto } from "./dto/event-report.dto";
import { Types } from "mongoose";

export class EventsService {
  async getEventReport(
    eventId: string,
    requesterId: string,
  ): Promise<EventReportDto> {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new AppError("ID sự kiện không hợp lệ", 400);
    }
    // 1. Lấy sự kiện, kiểm tra tồn tại & quyền
    const event = await eventRepository.findById(eventId);
    if (!event) throw new AppError("Sự kiện không tồn tại", 404);
    if (event.organizerId.toString() !== requesterId) {
      throw new AppError("Bạn không có quyền xem báo cáo sự kiện này", 403);
    }

    // 2. Lấy dữ liệu song song (Promise.all = nhanh hơn gọi tuần tự)
    const [ticketTypes, regStats, totalCheckedIn, totalReviews] =
      await Promise.all([
        eventRepository.getTicketTypes(eventId),
        eventRepository.getRegistrationStats(eventId),
        eventRepository.getCheckinCount(eventId),
        eventRepository.getReviewCount(eventId),
      ]);

    // 3. Build map: ticketTypeId → số đã bán (từ aggregate)
    const soldMap = new Map<string, number>();
    for (const stat of regStats) {
      soldMap.set(stat._id.toString(), stat.count);
    }

    // 4. Tính breakdown theo loại vé
    let totalRegistered = 0;
    let totalRevenue = 0;

    const ticketBreakdown = ticketTypes.map((tt) => {
      const sold = soldMap.get((tt._id as any).toString()) ?? 0;
      const revenue = sold * tt.price;
      totalRegistered += sold;
      totalRevenue += revenue;

      return {
        ticketTypeName: tt.name,
        price: tt.price,
        quota: tt.quota,
        sold,
        revenue,
      };
    });

    // 5. Tính tỷ lệ check-in
    const attendanceRate =
      totalRegistered > 0
        ? parseFloat(((totalCheckedIn / totalRegistered) * 100).toFixed(1))
        : 0;

    return {
      eventId: eventId,
      eventTitle: event.title,
      totalRegistered,
      totalCheckedIn,
      attendanceRate,
      totalRevenue,
      avgRating: event.avgRating,
      totalReviews,
      ticketBreakdown,
    };
  }

  async getDashboardSnapshot(eventId: string) {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new AppError("ID sự kiện không hợp lệ", 400);
    }

    const event = await eventRepository.findById(eventId);
    if (!event) throw new AppError("Sự kiện không tồn tại", 404);

    const [totalRegistered, totalCheckedIn] = await Promise.all([
      eventRepository.getRegistrationCount(eventId),
      eventRepository.getCheckinCount(eventId),
    ]);

    return {
      eventId,
      eventTitle: event.title,
      totalRegistered,
      totalCheckedIn,
      attendanceRate:
        totalRegistered > 0
          ? parseFloat(((totalCheckedIn / totalRegistered) * 100).toFixed(1))
          : 0,
    };
  }
}

export const eventsService = new EventsService();
