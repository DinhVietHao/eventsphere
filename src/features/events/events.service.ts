import { IEvent } from "./models/event.model";
import { AppError } from "../../shared/errors/AppError";
import { EventRepository } from "./repositories/event.repository";
import { ICreateEventDto, IUpdateEventDto } from "./dto/event.dto";
import { EventReportDto } from "./dto/event-report.dto";
import { Types } from "mongoose";
import { RegistrationRepository } from "../tickets/repositories/registration.repository";

const eventRepository = new EventRepository();
const registrationRepository = new RegistrationRepository();

export class EventService {
  // UC01 - Danh sách event công khai
  async getPublishedEvents(page: number, limit: number): Promise<IEvent[]> {
    return eventRepository.findPublished(page, limit);
  }

  // UC02 - Chi tiết 1 event
  async getEventById(id: string): Promise<IEvent> {
    const event = await eventRepository.findById(id);
    if (!event) {
      throw new AppError("Event not found", 404);
    }
    return event;
  }

  // UC03 - Tìm kiếm
  async searchEvents(keyword: string): Promise<IEvent[]> {
    if (!keyword || keyword.trim() == "") {
      throw new AppError("Keyword is required", 400);
    }
    return eventRepository.search(keyword.trim());
  }

  // UC04 - Lọc theo category và/hoặc khoảng thời gian
  async filterEvents(filters: {
    category?: string;
    startFrom?: Date;
    startTo?: Date;
  }): Promise<IEvent[]> {
    const hasFilter = filters.category || filters.startFrom || filters.startTo;
    if (!hasFilter) {
      throw new AppError("At least one filter is required", 400);
    }
    return eventRepository.findWithFilters(filters);
  }

  async countPublishedEvents(
    filters: { category?: string } = {},
  ): Promise<number> {
    return eventRepository.countPublished(filters);
  }

  // ───── UC13 — Organizer CRUD ─────

  // Lấy events đã approved của organizer — dùng cho dropdown gửi thông báo
  async getApprovedEvents(organizerId: string): Promise<IEvent[]> {
    return eventRepository.findApprovedByOrganizer(organizerId);
  }

  // Lấy danh sách events của organizer
  async getMyEvents(
    organizerId: string,
    page: number,
    limit: number,
  ): Promise<{
    events: (IEvent & { registrationsCount: number })[];
    total: number;
  }> {
    const [events, total] = await Promise.all([
      eventRepository.findByOrganizer(organizerId, page, limit),
      eventRepository.countByOrganizer(organizerId),
    ]);

    // Đếm số đăng ký thực tế cho tất cả event trong 1 query aggregate
    const eventIds = events.map((e: any) => e._id.toString());
    const countMap =
      await eventRepository.countRegistrationsByEventIds(eventIds);

    const eventsWithCount = events.map((e: any) => ({
      ...(e.toObject ? e.toObject() : e),
      registrationsCount: countMap.get(e._id.toString()) ?? 0,
    }));

    return { events: eventsWithCount, total };
  }

  // Tạo event mới
  async createEvent(
    organizerId: string,
    dto: ICreateEventDto,
  ): Promise<IEvent> {
    const min24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (new Date(dto.startDate) <= min24h) {
      throw new AppError("Ngày bắt đầu phải cách hiện tại ít nhất 24 giờ", 400);
    }

    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new AppError("Ngày kết thúc phải sau ngày bắt đầu", 400);
    }
    const status = dto.actionType === "submit" ? "PENDING" : "DRAFT";
    return eventRepository.create({
      title: dto.title,
      description: dto.description,
      category: dto.category,
      location: dto.location,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      bannerUrl: dto.bannerUrl,
      organizerId: organizerId as any,
      status,
    });
  }

  // Cập nhật event
  async updateEvent(
    id: string,
    organizerId: string,
    dto: IUpdateEventDto,
  ): Promise<IEvent> {
    const event = await eventRepository.findById(id);
    if (!event) {
      throw new AppError("Event không tồn tại", 404);
    }
    if (event.organizerId.toString() !== organizerId) {
      throw new AppError("Bạn không có quyền chỉnh sửa event này", 403);
    }
    if (event.status === "APPROVED" || event.status === "ONGOING") {
      throw new AppError(
        "Không thể chỉnh sửa event đã được duyệt hoặc đang diễn ra",
        403,
      );
    }

    const updated = await eventRepository.updateById(id, {
      title: dto.title,
      description: dto.description,
      category: dto.category,
      location: dto.location,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    return updated!;
  }

  // Gửi duyệt event — DRAFT → PENDING
  async submitEvent(id: string, organizerId: string): Promise<IEvent> {
    const event = await eventRepository.findById(id);
    console.log("submitEvent called:", {
      id,
      organizerId,
      status: event?.status,
      eventOrganizerId: event?.organizerId.toString(),
    });
    if (!event) {
      throw new AppError("Event không tồn tại", 404);
    }
    if (event.organizerId.toString() !== organizerId) {
      throw new AppError("Bạn không có quyền thực hiện thao tác này", 403);
    }
    if (event.status !== "DRAFT") {
      throw new AppError("Chỉ có thể gửi duyệt event ở trạng thái DRAFT", 400);
    }
    const updated = await eventRepository.updateById(id, { status: "PENDING" });
    return updated!;
  }

  // Xóa event
  async deleteEvent(id: string, organizerId: string): Promise<void> {
    const event = await eventRepository.findById(id);
    if (!event) {
      throw new AppError("Event không tồn tại", 404);
    }
    if (event.organizerId.toString() !== organizerId) {
      throw new AppError("Bạn không có quyền xóa event này", 403);
    }
    if (!["DRAFT", "REJECTED"].includes(event.status)) {
      throw new AppError(
        "Chỉ có thể xóa event ở trạng thái DRAFT hoặc REJECTED",
        403,
      );
    }

    await eventRepository.deleteById(id);
  }

  //UC-19-20
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
    const [ticketTypes, regStats, totalCheckedIn, totalReviews, avgRating] =
      await Promise.all([
        eventRepository.getTicketTypes(eventId),
        eventRepository.getRegistrationStats(eventId),
        eventRepository.getCheckinCount(eventId),
        eventRepository.getReviewCount(eventId),
        eventRepository.getAvgRating(eventId),
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
      avgRating,
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

  // ───── UC17 — Quản lý nhân viên check-in (Organizer) ─────

  async addStaffToEvent(eventId: string, email: string, organizerId: string) {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new AppError("ID sự kiện không hợp lệ", 400);
    }

    // 1. Kiểm tra xem sự kiện (eventId) có tồn tại hay không
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new AppError("Sự kiện không tồn tại", 404);
    }

    // 2. Kiểm tra xem người đang gọi API có đúng là chủ sở hữu của sự kiện này hay không
    if (event.organizerId.toString() !== organizerId) {
      throw new AppError(
        "Bạn không có quyền quản lý nhân sự cho sự kiện này",
        403,
      );
    }

    // 3. Kiểm tra xem tài khoản chuẩn bị thêm có tồn tại và đúng role là staff hay không
    const staff = (await eventRepository.findUserByEmail(email)) as any;
    if (!staff) {
      throw new AppError("Không tìm thấy tài khoản với email này", 404);
    }

    if (staff.role !== "staff") {
      throw new AppError("Tài khoản này không có quyền nhân viên (staff)", 400);
    }

    // 4. Kiểm tra xem Staff này đã được thêm vào sự kiện trước đó chưa (tránh trùng lặp)
    const isAssigned = await eventRepository.checkStaffAssigned(
      eventId,
      staff._id.toString(),
    );
    if (isAssigned) {
      throw new AppError("Nhân viên này đã được phân công vào sự kiện", 400);
    }

    // 5. Nếu tất cả điều kiện thỏa mãn, gọi xuống Repository để thêm mới
    return eventRepository.addStaffToEvent(
      eventId,
      staff._id.toString(),
      organizerId,
    );
  }

  async removeStaffFromEvent(
    eventId: string,
    staffId: string,
    organizerId: string,
  ) {
    if (!Types.ObjectId.isValid(eventId) || !Types.ObjectId.isValid(staffId)) {
      throw new AppError("ID không hợp lệ", 400);
    }

    // 1. Kiểm tra sự kiện tồn tại
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new AppError("Sự kiện không tồn tại", 404);
    }

    // 2. Kiểm tra quyền sở hữu
    if (event.organizerId.toString() !== organizerId) {
      throw new AppError(
        "Bạn không có quyền quản lý nhân sự cho sự kiện này",
        403,
      );
    }

    // 3. Gọi xuống Repository để xóa staff
    await eventRepository.removeStaffFromEvent(eventId, staffId);
  }

  async getStaffsByEventId(eventId: string, requesterId: string) {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new AppError("ID sự kiện không hợp lệ", 400);
    }

    // 1. Kiểm tra sự kiện tồn tại
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new AppError("Sự kiện không tồn tại", 404);
    }

    // 2. Kiểm tra quyền sở hữu (Chỉ chủ sự kiện mới được xem danh sách staff của họ)
    if (event.organizerId.toString() !== requesterId) {
      throw new AppError(
        "Bạn không có quyền xem danh sách nhân sự của sự kiện này",
        403,
      );
    }

    // 3. Gọi repository lấy dữ liệu
    return eventRepository.getStaffsByEventId(eventId);
  }

  // ───── UC15 — Xem danh sách đăng ký (Organizer) ─────
  async getRegistrationsByEvent(
    eventId: string,
    organizerId: string,
    role: string,
    page: number,
    limit: number,
  ) {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new AppError("ID sự kiện không hợp lệ", 400);
    }

    const event = await eventRepository.findById(eventId);
    if (!event) throw new AppError("Sự kiện không tồn tại", 404);

    if (role !== "admin" && event.organizerId.toString() !== organizerId) {
      throw new AppError("Bạn không có quyền xem danh sách đăng ký này", 403);
    }

    const [rawList, total] = await Promise.all([
      registrationRepository.findByEventId(eventId, page, limit),
      registrationRepository.countByEventId(eventId),
    ]);

    const registrations = rawList.map((reg: any) => ({
      attendeeName: reg.userId?.name ?? "Không rõ",
      attendeeEmail: reg.userId?.email ?? "Không rõ",
      ticketType: reg.ticketTypeId?.name ?? "Standard",
      createdAt: reg.createdAt,
      status: reg.status,
      paymentStatus: reg.paymentStatus,
    }));

    return { registrations, total, page, limit };
  }

  async exportRegistrationsCSV(
    eventId: string,
    userId: string,
    role: string,
  ): Promise<string> {
    if (!Types.ObjectId.isValid(eventId))
      throw new AppError("ID sự kiện không hợp lệ", 400);

    const event = await eventRepository.findById(eventId);
    if (!event) throw new AppError("Sự kiện không tồn tại", 404);

    if (role !== "admin" && event.organizerId.toString() !== userId)
      throw new AppError("Bạn không có quyền xuất dữ liệu sự kiện này", 403);

    const rows = await registrationRepository.findAllByEventId(eventId);

    const header = [
      "STT",
      "Họ tên",
      "Email",
      "Số điện thoại",
      "Loại vé",
      "Giá vé",
      "Ngày đăng ký",
      "Trạng thái",
    ];
    const lines = rows.map((reg: any, i: number) =>
      [
        i + 1,
        reg.userId?.name ?? "",
        reg.userId?.email ?? "",
        reg.userId?.phone ?? "",
        reg.ticketTypeId?.name ?? "Standard",
        reg.ticketTypeId?.price ?? 0,
        new Date(reg.createdAt).toLocaleDateString("vi-VN"),
        reg.status ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );

    return [header.join(","), ...lines].join("\n");
  }

  // Lấy danh sách sự kiện mà Staff được phân công (Phục vụ UC21-22 Soát vé)
  async getEventsByStaffId(staffId: string): Promise<IEvent[]> {
    if (!Types.ObjectId.isValid(staffId)) {
      throw new AppError("ID nhân viên không hợp lệ", 400);
    }

    // Gọi xuống repository lấy danh sách sự kiện
    // Chỉ lấy những sự kiện đang mở (APPROVED hoặc ONGOING) để nhân viên soát vé
    return eventRepository.getEventsByStaffId(staffId);
  }
}
