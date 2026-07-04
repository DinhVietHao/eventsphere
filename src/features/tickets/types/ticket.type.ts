import { Types } from "mongoose";

export interface ITicket {
    registrationId: Types.ObjectId;
    attendeeId: Types.ObjectId;
    eventId: Types.ObjectId;
    ticketTypeId: Types.ObjectId;
    qrCode: string;
    status: "ISSUED" | "CHECKED_IN" | "EXPIRED" | "CANCELLED";
    issuedAt: Date;
    expiredAt?: Date;
}
