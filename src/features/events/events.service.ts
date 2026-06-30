import { IEvent } from "./models/event.model";
import { AppError } from "../../shared/errors/AppError";
import { EventRepository } from "./repositories/event.repository";
import { ICreateEventDto, IUpdateEventDto } from "./dto/event.dto";

const eventRepository = new EventRepository();

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

  // Lấy danh sách events của organizer
  async getMyEvents(
    organizerId: string,
    page: number,
    limit: number,
  ): Promise<{ events: IEvent[]; total: number }> {
    const [events, total] = await Promise.all([
      eventRepository.findByOrganizer(organizerId, page, limit),
      eventRepository.countByOrganizer(organizerId),
    ]);
    return { events, total };
  }

  // Tạo event mới
  async createEvent(
    organizerId: string,
    dto: ICreateEventDto,
  ): Promise<IEvent> {
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
}
