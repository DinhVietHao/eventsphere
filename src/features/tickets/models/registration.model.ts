import { Schema, model, Document } from 'mongoose';

export interface IRegistrationDocument extends Document {
  userId        : Schema.Types.ObjectId;
  eventId       : Schema.Types.ObjectId;
  ticketTypeId  : Schema.Types.ObjectId;
  paymentStatus : 'pending' | 'paid' | 'refunded';
  paymentRef   ?: string;
  registeredAt  : Date;
}

const registrationSchema = new Schema<IRegistrationDocument>(
  {
    userId       : { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId      : { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    ticketTypeId : { type: Schema.Types.ObjectId, ref: 'TicketType', required: true },
    paymentStatus: { 
      type   : String,
      enum   : ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    paymentRef  : { type: String, default: null },
    registeredAt: { type: Date, default: Date.now },
  },
  { collection: 'registrations' }
);

registrationSchema.index({ userId: 1, eventId: 1 }, { name: 'idx_registrations_unique', unique: true });
registrationSchema.index({ eventId: 1, paymentStatus: 1 }, { name: 'idx_registrations_event_payment' });
registrationSchema.index({ userId: 1, eventId: 1 }, { name: 'idx_registrations_user_event' });

export const RegistrationModel = model<IRegistrationDocument>('Registration', registrationSchema);