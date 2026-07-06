import { TicketModel } from "../models/ticket.model";
import { ITicket } from "../types/ticket.type";
import { Types } from "mongoose";


export class TicketRepository {
  // Tao ticket QR sau khi registration mien phi duoc confirm.
  async create(
    data: ITicket
  ) {
    const ticket = new TicketModel(data);
    const savedTicket = await ticket.save();
    return savedTicket;
  }

  async findByRegistrationIdPlain(registrationId: string) {
    return TicketModel.findOne({
      registrationId: new Types.ObjectId(registrationId),
    });
  }

  async findDetailById(ticketId: string) {
    return TicketModel.findById(new Types.ObjectId(ticketId))
      .populate("eventId", "title startDate endDate startTime endTime location")
      .populate("ticketTypeId", "name price")
      .populate("registrationId", "userId status")
      .lean();
  }
}
