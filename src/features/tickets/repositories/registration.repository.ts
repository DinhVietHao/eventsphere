import { Types } from "mongoose";
import {
  Registration,
} from "../models/registration.model";
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
      status: { $ne: "cancelled" },
    });
  }

  // Tao registration moi trong transaction UC07.
  async create(data: IRegistration): Promise<IRegistration> {
    const registration = new Registration(data);
    return await registration.save();
  }
}
