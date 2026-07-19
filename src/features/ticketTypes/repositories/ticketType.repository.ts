import {
  ITicketType,
  TicketType,
} from "../../events/models/ticketType.model";
import { Types } from "mongoose";

export class TicketTypeRepository {
  // Lấy tất cả loại vé của 1 event
  async findByEventId(eventId: string): Promise<ITicketType[]> {
    return TicketType.find({
      eventId: new Types.ObjectId(eventId),
    } as any).sort({ price: 1 });
  }

  // Tìm 1 loại vé theo id (dùng khi sửa/xóa)
  async findById(id: string): Promise<ITicketType | null> {
    return TicketType.findById(id);
  }

  // Tạo mới
  async create(
    data: Partial<ITicketType>,
  ): Promise<ITicketType> {
    return TicketType.create(data);
  }

  // Cập nhật, trả về document mới sau khi update
  async updateById(
    id: string,
    data: Partial<ITicketType>,
  ): Promise<ITicketType | null> {
    return TicketType.findByIdAndUpdate(id, data, {
      returnDocument: "after", // trả về document SAU khi update
      runValidators: true, // chạy lại validation của schema
    });
  }

  // Xóa
  async deleteById(id: string): Promise<void> {
    await TicketType.findByIdAndDelete(id);
  }
}
