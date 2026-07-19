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
      .populate("eventId", "title startDate endDate startTime endTime location bannerUrl")
      .populate("ticketTypeId", "name price")
      .populate("registrationId", "userId status registeredAt")
      .lean();
  }

  async findByAttendeeIdWithDetails(attendeeId: string) {
    return TicketModel.find({ attendeeId: new Types.ObjectId(attendeeId) })
      .populate("eventId", "title startDate endDate startTime endTime location bannerUrl")
      .populate("ticketTypeId", "name price")
      .populate("registrationId", "userId status registeredAt")
      .sort({ issuedAt: -1 })
      .lean();
  }

  async findAttendanceByEventAndUser(
    eventId: string, userId: string
  ) {
    const eventObjectId = new Types.ObjectId(eventId);
    const userObjectId = new Types.ObjectId(userId);
    return TicketModel.findOne({
      eventId: eventObjectId,
      attendeeId: userObjectId,
      status: { $in: ["ISSUED", "CHECKED_IN", "EXPIRED"] },
    });
  }
}
