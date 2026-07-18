import { adminRepository } from "./repositories/admin.repository";
import { IRevenueReportQueryDto } from "./dto/revenue-report.dto";
import { AppError } from "../../shared/errors/AppError";
import { emailService } from "../../shared/services/email.service";
import { EventRepository } from "../events/repositories/event.repository";
import { UserRepository } from "../auth/repositories/user.repository";
import { TicketTypeRepository } from "../ticketTypes/repositories/ticketType.repository";
import {
  IEventReviewDetailResult,
  IEventReviewResult,
  IEventWithOrganizer,
  IOrganizerSummary,
  IPendingEventListResult,
  IPendingEventQueryDto,
} from "./dto/admin.dto";

export class AdminService {
  private eventRepository = new EventRepository();
  private userRepository = new UserRepository();
  private ticketTypeRepository = new TicketTypeRepository();
  constructor() {
    this.eventRepository = new EventRepository();
    this.userRepository = new UserRepository();
    this.ticketTypeRepository = new TicketTypeRepository();
  }
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

    const totalPeriodRevenue = rawReport.reduce(
      (sum, item) => sum + item.totalRevenue,
      0,
    );
    const totalPeriodTickets = rawReport.reduce(
      (sum, item) => sum + item.totalTicketSold,
      0,
    );

    return {
      groupBy,
      filters,
      totalPeriodRevenue,
      totalPeriodTickets,
      chartData: rawReport,
    };
  }

  // Lấy danh sách organizer cho bộ lọc
  async getOrganizersList() {
    return adminRepository.getOrganizersList();
  }

  /**
   * UC23 - Get pending events for admin review.
   */
  async getPendingEvents(
    query: IPendingEventQueryDto,
  ): Promise<IPendingEventListResult> {
    const keyword = query.keyword?.trim() || "";
    const organizerIds = keyword
      ? await this.userRepository.findOrganizerIdsByKeyword(keyword)
      : [];
    const result = await this.eventRepository.findPendingForAdmin({
      page: query.page,
      limit: query.limit,
      keyword,
      organizerIds,
    });

    return {
      events: result.events,
      currentPage: query.page,
      totalPages: Math.max(1, Math.ceil(result.totalItems / query.limit)),
      totalItems: result.totalItems,
      keyword,
    };
  }

  /**
   * UC23 - Get one event and ticket types for review.
   */
  async getEventReviewDetail(
    eventId: string,
  ): Promise<IEventReviewDetailResult> {
    const event = await this.eventRepository.findEventForAdminReview(eventId);
    if (!event) {
      throw new AppError("Không tìm thấy sự kiện", 404);
    }

    const ticketTypes = await this.ticketTypeRepository.findByEventId(eventId);
    return { event, ticketTypes };
  }

  /**
   * UC23 - Approve a pending event and notify organizer.
   */
  async approveEvent(
    eventId: string,
    adminId: string,
  ): Promise<IEventReviewResult> {
    const currentEvent = await this.getPendingEventOrThrow(eventId);
    const organizer = this.getOrganizerOrThrow(currentEvent);
    const updatedEvent = await this.eventRepository.approvePendingEvent(
      eventId,
      adminId,
    );

    if (!updatedEvent) {
      throw new AppError("Sự kiện này không còn ở trạng thái chờ duyệt", 409);
    }

    const emailSent = await this.sendEmailSafely(() =>
      emailService.sendEventApprovedEmail({
        organizerEmail: organizer.email,
        organizerName: organizer.name,
        eventTitle: updatedEvent.title,
        reviewedAt: updatedEvent.reviewedAt || new Date(),
      }),
    );

    return { event: updatedEvent, emailSent };
  }

  /**
   * UC23 - Reject a pending event, move it to draft, and notify organizer.
   */
  async rejectEvent(
    eventId: string,
    adminId: string,
    rejectionReason: string,
  ): Promise<IEventReviewResult> {
    const trimmedReason = rejectionReason.trim();
    const currentEvent = await this.getPendingEventOrThrow(eventId);
    const organizer = this.getOrganizerOrThrow(currentEvent);
    const updatedEvent = await this.eventRepository.rejectPendingEvent(
      eventId,
      adminId,
      trimmedReason,
    );

    if (!updatedEvent) {
      throw new AppError("Sự kiện này không còn ở trạng thái chờ duyệt", 409);
    }

    const emailSent = await this.sendEmailSafely(() =>
      emailService.sendEventRejectedEmail({
        organizerEmail: organizer.email,
        organizerName: organizer.name,
        eventTitle: updatedEvent.title,
        rejectionReason: trimmedReason,
        editEventUrl: this.buildOrganizerEditUrl(eventId),
      }),
    );

    return { event: updatedEvent, emailSent };
  }

  private async getPendingEventOrThrow(
    eventId: string,
  ): Promise<IEventWithOrganizer> {
    const event = await this.eventRepository.findEventForAdminReview(eventId);
    if (!event) {
      throw new AppError("Không tìm thấy sự kiện", 404);
    }

    if (event.status !== "PENDING") {
      throw new AppError("Sự kiện này không còn ở trạng thái chờ duyệt", 409);
    }

    return event;
  }

  private getOrganizerOrThrow(event: IEventWithOrganizer): IOrganizerSummary {
    const organizer = event.organizerId;
    if (!organizer) {
      throw new AppError("Không tìm thấy Organizer của sự kiện", 404);
    }

    if (!organizer.email) {
      throw new AppError("Organizer chưa có email để nhận thông báo", 400);
    }

    return organizer;
  }

  private async sendEmailSafely(
    sendEmail: () => Promise<void>,
  ): Promise<boolean> {
    try {
      await sendEmail();
      return true;
    } catch (err) {
      console.error("[AdminService] Failed to send event review email", err);
      return false;
    }
  }

  private buildOrganizerEditUrl(eventId: string): string {
    const baseUrl = process.env.APP_BASE_URL || process.env.BASE_URL || "";
    return `${baseUrl}/organizer/events/${eventId}/edit`;
  }
}

export const adminService = new AdminService();
