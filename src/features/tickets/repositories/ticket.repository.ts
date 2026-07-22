import { TicketModel } from "../models/ticket.model";
import { ITicket } from "../types/ticket.type";
import { Types } from "mongoose";


export class TicketRepository {
  // Tao ticket QR sau khi registration mien phi duoc confirm.
  async create(
    data: ITicket
  ) {
    try {
      const ticket = new TicketModel(data);
      const savedTicket = await ticket.save();
      return { ticket: savedTicket, created: true };
    } catch (error: any) {
      if (error?.code === 11000) {
        const existingTicket = await this.findByRegistrationIdPlain(
          data.registrationId.toString(),
        );
        if (existingTicket) return { ticket: existingTicket, created: false };
      }

      throw error;
    }
  }

  async findByRegistrationIdPlain(registrationId: string) {
    return TicketModel.findOne({
      registrationId: new Types.ObjectId(registrationId),
    });
  }

  async findDetailById(ticketId: string, attendeeId: string) {
    return TicketModel.findOne({
      _id: new Types.ObjectId(ticketId),
      attendeeId: new Types.ObjectId(attendeeId),
    })
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

  async findByRegistrationIds(registrationIds: string[]) {
    if (registrationIds.length === 0) return [];

    return TicketModel.find({
      registrationId: {
        $in: registrationIds.map((id) => new Types.ObjectId(id)),
      },
    })
      .select("_id registrationId attendeeId eventId ticketTypeId qrCode status issuedAt expiredAt")
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
      status: "CHECKED_IN",
    });
  }
}
