import { adminRepository } from "./repositories/admin.repository";
import {IRevenueReportQueryDto} from "./dto/revenue-report.dto";

export class AdminService {
  async getSystemDashboard() {
    // Lấy dữ liệu song song
    const [
      usersByRole,
      eventsByStatus,
      totalPaidRegistrations,
      totalCheckins,
      recentPendingEvents,
      recentUsers,
    ] = await Promise.all([
      adminRepository.countUsersByRole(),
      adminRepository.countEventsByStatus(),
      adminRepository.countPaidRegistrations(),
      adminRepository.countTotalCheckins(),
      adminRepository.getRecentPendingEvents(),
      adminRepository.getRecentUsers(),
    ]);

    // Chuyển aggregate array thành object dễ dùng
    const userStats = usersByRole.reduce(
      (acc: Record<string, number>, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {},
    );

    const eventStats = eventsByStatus.reduce(
      (acc: Record<string, number>, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {},
    );

    return {
      users: {
        total: Object.values(userStats).reduce((a, b) => a + b, 0),
        attendee: userStats["attendee"] || 0,
        organizer: userStats["organizer"] || 0,
        staff: userStats["staff"] || 0,
        admin: userStats["admin"] || 0,
      },
      events: {
        total: Object.values(eventStats).reduce((a, b) => a + b, 0),
        draft: eventStats["DRAFT"] || 0,
        pending: eventStats["PENDING"] || 0,
        approved: eventStats["APPROVED"] || 0,
        ongoing: eventStats["ONGOING"] || 0,
        ended: eventStats["ENDED"] || 0,
        cancelled: eventStats["CANCELLED"] || 0,
      },
      tickets: {
        totalPaid: totalPaidRegistrations,
      },
      checkins: {
        total: totalCheckins,
      },
      recentPendingEvents,
      recentUsers,
    };
  }

  // --- UC26: VIEW REVENUE REPORT (BÁO CÁO DOANH THU TOÀN NỀN TẢNG) ---
  async getRevenueReport(query: IRevenueReportQueryDto) {
      const { groupBy = "day", ...filters } = query;

      const rawReport = await adminRepository.getRevenueReport(filters, groupBy);

      const totalPeriodRevenue = rawReport.reduce((sum, item) => sum + item.totalRevenue, 0)
      const totalPeriodTickets = rawReport.reduce((sum, item) => sum + item.totalTicketSold, 0)


    return {
        groupBy,
      filters,
      totalPeriodRevenue,
      totalPeriodTickets,
      chartData: rawReport
    }
  }

  // Lấy danh sách organizer cho bộ lọc
  async getOrganizersList() {
    return adminRepository.getOrganizersList();
  }


}

export const adminService = new AdminService();
