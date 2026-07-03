// src/features/events/dto/event-report.dto.ts

export interface TicketBreakdown {
  ticketTypeName: string;
  price: number;
  quota: number;
  sold: number;
  revenue: number;
}

export interface EventReportDto {
  eventId: string;
  eventTitle: string;
  totalRegistered: number; // Tổng đăng ký (đã paid)
  totalCheckedIn: number; // Tổng check-in thực tế
  attendanceRate: number; // % checked-in / registered
  totalRevenue: number; // Tổng doanh thu (VND)
  avgRating: number; // Điểm tb từ event.avgRating
  totalReviews: number; // Số lượt đánh giá
  ticketBreakdown: TicketBreakdown[]; // Chi tiết theo loại vé
}
