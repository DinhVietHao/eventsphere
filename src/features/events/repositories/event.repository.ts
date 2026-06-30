import { IEvent, Event } from "../models/event.model";
import { Types } from "mongoose";

export class EventRepository {
  // UC01 - Danh sách event công khai, có phân trang
  async findPublished(page: number, limit: number): Promise<IEvent[]> {
    const skip = (page - 1) * limit;
    return Event.find({ status: "APPROVED" })
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);
  }

  // UC02 - Chi tiết 1 event
  async findById(id: string): Promise<IEvent | null> {
    return Event.findById(id);
  }

  // UC03 - Tìm kiếm full-text
  async search(keyword: string): Promise<IEvent[]> {
    return Event.find({
      $text: { $search: keyword },
      status: "APPROVED",
    });
  }

  // UC04 - Lọc theo category và/hoặc khoảng thời gian
  async findWithFilters(filters: {
    category?: string;
    startFrom?: Date;
    startTo?: Date;
  }): Promise<IEvent[]> {
    const query: Record<string, unknown> = { status: "APPROVED" };

    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.startFrom || filters.startTo) {
      query.startDate = {
        ...(filters.startFrom && { $gte: filters.startFrom }),
        ...(filters.startTo && { $lte: filters.startTo }),
      };
    }

    return Event.find(query).sort({ startDate: 1 });
  }

  // Đếm tổng số event để tính pagination
  async countPublished(filters: { category?: string } = {}): Promise<number> {
    const query: Record<string, unknown> = { status: "APPROVED" };
    if (filters.category) query.category = filters.category;
    return Event.countDocuments(query);
  }

  // ───── UC13 — Organizer CRUD ─────

  // Lấy danh sách events của 1 organizer, có phân trang
  async findByOrganizer(
    organizerId: string,
    page: number,
    limit: number,
  ): Promise<IEvent[]> {
    const skip = (page - 1) * limit;
    return Event.find({ organizerId: new Types.ObjectId(organizerId) } as any)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  // Đếm tổng events của organizer để tính pagination
  async countByOrganizer(organizerId: string): Promise<number> {
    return Event.countDocuments({
      organizerId: new Types.ObjectId(organizerId),
    } as any);
  }

  // Tạo event mới
  async create(data: Partial<IEvent>): Promise<IEvent> {
    return Event.create(data);
  }

  // Cập nhật event theo id
  async updateById(id: string, data: Partial<IEvent>): Promise<IEvent | null> {
    return Event.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      runValidators: true,
    });
  }

  // Xóa event theo id
  async deleteById(id: string): Promise<void> {
    await Event.findByIdAndDelete(id);
  }
}
