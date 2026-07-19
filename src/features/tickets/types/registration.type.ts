import { Types } from "mongoose";

export interface IRegistration {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  ticketTypeId: Types.ObjectId;
  status: 'pending_payment' | 'confirmed' | 'payment_failed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'free' | 'pending' | 'refunded';
  paymentRef?: string;
  registeredAt?: Date;
}
