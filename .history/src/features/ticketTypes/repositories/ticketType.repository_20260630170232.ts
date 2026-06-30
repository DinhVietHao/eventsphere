import { ITicketTypeDocument, TicketTypeModel } from "../../events/models/ticketType.model";

export class TicketTypeRepository {
  // Lấy tất cả loại vé của 1 event
  async findByEventId(eventId: string): Promise<ITicketTypeDocument[]> {
    return TicketTypeModel.find({ eventId });
  }

  // Tìm 1 loại vé theo id (dùng khi sửa/xóa)
  async findById(id: string): Promise<ITicketTypeDocument | null> {
    return TicketTypeModel.findById(id);
  }

  // Tạo mới
  async create(data: Partial<ITicketTypeDocument>): Promise<ITicketTypeDocument> {
    return TicketTypeModel.create(data);
  }

  // Cập nhật, trả về document mới sau khi update
  async updateById(
    id: string,
    data: Partial<ITicketTypeDocument>,
  ): Promise<ITicketTypeDocument | null> {
    return TicketTypeModel.findByIdAndUpdate(id, data, {
      returnDocument: "after",  // trả về document SAU khi update
      runValidators: true,      // chạy lại validation của schema
    });
  }

  // Xóa
  async deleteById(id: string): Promise<void> {
    await TicketTypeModel.findByIdAndDelete(id);
  }
}
