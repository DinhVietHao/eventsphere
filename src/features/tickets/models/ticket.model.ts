import { Schema, model, Document, Types } from 'mongoose';

export interface ITicketDocument extends Document {
  registrationId: Types.ObjectId;
  attendeeId: Types.ObjectId;
  eventId: Types.ObjectId;
  ticketTypeId: Types.ObjectId;
  qrCode: string;
  status: 'ISSUED' | 'CHECKED_IN' | 'EXPIRED' | 'CANCELLED';
  issuedAt: Date;
  expiredAt?: Date;
}

const ticketSchema = new Schema<ITicketDocument>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration', required: true, unique: true },
    attendeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    ticketTypeId: { type: Schema.Types.ObjectId, ref: 'TicketType', required: true },
    qrCode: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['ISSUED', 'CHECKED_IN', 'EXPIRED', 'CANCELLED'],
      default: 'ISSUED'
    },
    issuedAt: { type: Date, default: Date.now },
    expiredAt: { type: Date, default: null },
  },
  { collection: 'tickets' }
);

ticketSchema.index({ qrCode: 1 }, { name: 'idx_tickets_qrCode', unique: true });
ticketSchema.index({ registrationId: 1 }, { name: 'idx_tickets_registrationId', unique: true });
ticketSchema.index({ status: 1, expiredAt: 1 }, { name: 'idx_tickets_status_expiredAt' });
ticketSchema.index({ attendeeId: 1, eventId: 1 }, { name: 'idx_tickets_attendee_event' });

export const TicketModel = model<ITicketDocument>('Ticket', ticketSchema);
