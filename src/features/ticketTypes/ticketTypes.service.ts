import { ITicketType } from "../events/models/ticketType.model";
import { AppError } from "../../shared/errors/AppError";
import { TicketTypeRepository } from "./repositories/ticketType.repository";
import { EventRepository } from "../events/repositories/event.repository";
import {
  ICreateTicketTypeDto,
  IUpdateTicketTypeDto,
} from "./dto/ticketType.dto";

const ticketTypeRepository = new TicketTypeRepository();
const eventRepository = new EventRepository();

export class TicketTypeService {
  async getTicketTypes(eventId: string): Promise<ITicketType[]> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new AppError("Event không tồn tại", 404);
    return ticketTypeRepository.findByEventId(eventId);
  }

  async createTicketType(
    eventId: string,
    organizerId: string,
    dto: ICreateTicketTypeDto,
  ): Promise<ITicketType> {
    const event = await eventRepository.findById(eventId);
    if (!event) throw new AppError("Event không tồn tại", 404);

    // Kiểm tra quyền — chỉ organizer của event mới được thêm vé
    if (event.organizerId.toString() !== organizerId)
      throw new AppError("Bạn không có quyền quản lý event này", 403);

    // Chỉ thêm được khi event chưa được duyệt
    if (!["DRAFT", "PENDING"].includes(event.status))
      throw new AppError(
        "Chỉ có thể thêm loại vé khi event ở trạng thái DRAFT hoặc PENDING",
        400,
      );

    return ticketTypeRepository.create({ ...dto, eventId: eventId as any });
  }

  async updateTicketType(
    id: string,
    organizerId: string,
    dto: IUpdateTicketTypeDto,
  ): Promise<ITicketType> {
    const ticketType = await ticketTypeRepository.findById(id);
    if (!ticketType) throw new AppError("Loại vé không tồn tại", 404);

    const event = await eventRepository.findById(ticketType.eventId.toString());
    if (!event) throw new AppError("Event không tồn tại", 404);
    if (event.organizerId.toString() !== organizerId)
      throw new AppError("Bạn không có quyền chỉnh sửa loại vé này", 403);
    if (!["DRAFT", "PENDING"].includes(event.status))
      throw new AppError("Không thể chỉnh sửa loại vé của event đã duyệt", 400);

    // Không cho giảm quota xuống dưới số đã bán
    if (dto.quota !== undefined && dto.quota < ticketType.sold)
      throw new AppError(`Quota phải >= số đã bán (${ticketType.sold})`, 400);

    const updated = await ticketTypeRepository.updateById(id, dto);
    return updated!;
  }

  async deleteTicketType(id: string, organizerId: string): Promise<void> {
    const ticketType = await ticketTypeRepository.findById(id);
    if (!ticketType) throw new AppError("Loại vé không tồn tại", 404);

    const event = await eventRepository.findById(ticketType.eventId.toString());
    if (!event) throw new AppError("Event không tồn tại", 404);
    if (event.organizerId.toString() !== organizerId)
      throw new AppError("Bạn không có quyền xóa loại vé này", 403);

    // Không xóa được nếu đã có người mua
    if (ticketType.sold > 0)
      throw new AppError("Không thể xóa loại vé đã có người mua", 400);

    await ticketTypeRepository.deleteById(id);
  }
}
