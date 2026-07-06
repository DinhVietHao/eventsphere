import { Types } from "mongoose";
import { Registration } from "../models/registration.model";
import { IRegistration } from "../types/registration.type";

export class RegistrationRepository {
  // Tim registration con hieu luc cua attendee trong mot event.
  async findActiveByAttendeeAndEvent(
    attendeeId: string,
    eventId: string
  ): Promise<IRegistration | null> {
    return Registration.findOne({
      userId: new Types.ObjectId(attendeeId),
      eventId: new Types.ObjectId(eventId),
      status: { $nin: ["cancelled", "payment_failed"] },
    });
  }

  async findLatestByAttendeeAndEvent(
    attendeeId: string,
    eventId: string,
  ): Promise<IRegistration | null> {
    return Registration.findOne({
      userId: new Types.ObjectId(attendeeId),
      eventId: new Types.ObjectId(eventId),
    }).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IRegistration | null> {
    return Registration.findById(id);
  }

  async findByIdAndAttendee(
    registrationId: string,
    attendeeId: string,
  ): Promise<IRegistration | null> {
    return Registration.findOne({
      _id: new Types.ObjectId(registrationId),
      userId: new Types.ObjectId(attendeeId),
    });
  }

  // Tao registration moi trong transaction 
  async create(data: IRegistration): Promise<IRegistration> {
    const registration = new Registration(data);
    return await registration.save();
  }

  async resetForRetry(
    registrationId: string,
    data: Pick<IRegistration, "ticketTypeId" | "status" | "paymentStatus">,
  ): Promise<IRegistration | null> {
    return Registration.findOneAndUpdate(
      { _id: new Types.ObjectId(registrationId) },
      {
        ticketTypeId: data.ticketTypeId,
        status: data.status,
        paymentStatus: data.paymentStatus,
        paymentRef: null,
        registeredAt: new Date(),
      },
      { returnDocument: "after" },
    );
  }

  // Cap nhat trang thai registration khi payment that bai.
  async updateRegistrationStatus(
    registrationId: string,
    status: IRegistration["status"],
    paymentStatus: IRegistration["paymentStatus"],
    paymentRef?: string,
  ) {
    return Registration.findOneAndUpdate(
      { _id: new Types.ObjectId(registrationId) },
      {
        status,
        paymentStatus,
        ...(paymentRef ? { paymentRef } : {}),
      },
      { new: true },
    );
  }

  async findAttendanceByEventAndUser(
    eventId: string, userId: string
  ) {
    const eventObjectId = new Types.ObjectId(eventId);
    const userObjectId = new Types.ObjectId(userId);
    return Registration.findOne({
      eventId: eventObjectId,
      userId: userObjectId,
      status: { $nin: ["cancelled", "payment_failed"] },
      paymentStatus: { $in: ["paid", "free"] },
    })
  }
}
