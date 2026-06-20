// src/features/events/repositories/event.repository.ts
import mongoose, { Types } from "mongoose";
import { EventModel } from "../models/event.model";
import { TicketTypeModel } from "../models/ticketType.model";
import { RegistrationModel } from "../../tickets/models/registration.model";
import { CheckinLogModel } from "../../checkin/models/checkinLog.model";
import { ReviewModel } from "../../reviews/models/review.model";

export class EventRepository {
  async findById(id: string) {
    return EventModel.findById(id).lean();
  }

  // Đếm registrations đã paid theo từng ticketTypeId
  async getRegistrationStats(eventId: string) {
    return RegistrationModel.aggregate([
      {
        // getRegistrationStats — chỗ $match trong aggregate
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: "$ticketTypeId",
          count: { $sum: 1 },
        },
      },
    ]);
    // Trả về: [{ _id: ObjectId, count: number }, ...]
  }

  // Đếm tổng check-in của sự kiện
  async getCheckinCount(eventId: string) {
    return CheckinLogModel.countDocuments({
      eventId: new mongoose.Types.ObjectId(eventId),
    } as any);
  }

  // Lấy tất cả ticket types của sự kiện
  async getTicketTypes(eventId: string) {
    return TicketTypeModel.find({
      eventId: new mongoose.Types.ObjectId(eventId),
    } as any).lean();
  }

  // Đếm số lượt review
  async getReviewCount(eventId: string) {
    return ReviewModel.countDocuments({
      eventId: new mongoose.Types.ObjectId(eventId),
    } as any);
  }

  async getRegistrationCount(eventId: string) {
    return RegistrationModel.countDocuments({
      eventId: new mongoose.Types.ObjectId(eventId),
      paymentStatus: "paid",
    } as any);
  }
}

export const eventRepository = new EventRepository();
