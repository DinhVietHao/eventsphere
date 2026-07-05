import { Schema, model, Document, Types } from 'mongoose';

export interface IRegistration extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  ticketTypeId: Types.ObjectId;
  status: 'pending_payment' | 'confirmed' | 'payment_failed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'free' | 'pending';
  paymentRef?: string;
  registeredAt?: Date;
}

const registrationSchema = new Schema<IRegistration>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, alias: 'attendeeId' },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    ticketTypeId: { type: Schema.Types.ObjectId, ref: 'TicketType', required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'payment_failed', 'cancelled'],
      default: 'pending_payment'
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'free', 'pending'],
      default: 'unpaid'
    },
    paymentRef: { type: String, default: null },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'registrations' }
);

registrationSchema.index({ userId: 1, eventId: 1 }, { name: 'idx_registrations_unique', unique: true });
registrationSchema.index({ eventId: 1, paymentStatus: 1 }, { name: 'idx_registrations_event_payment' });
registrationSchema.index({ userId: 1, eventId: 1, ticketTypeId: 1 }, { name: 'idx_registrations_user_event_ticketType' });

export const Registration = model<IRegistration>('Registration', registrationSchema);
