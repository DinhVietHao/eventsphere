import { IEvent } from "./models/event.model";
import { AppError } from "../../shared/errors/AppError";
import { EventRepository } from "./repositories/event.repository";

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
}
