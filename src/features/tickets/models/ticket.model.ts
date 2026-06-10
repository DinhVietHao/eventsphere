import { Schema, model, Document } from 'mongoose';

export interface ITicketDocument extends Document {
  registrationId: Schema.Types.ObjectId;
  qrCode        : string;
  status        : 'ISSUED' | 'CHECKED_IN' | 'EXPIRED' | 'CANCELLED';
  issuedAt      : Date;
  expiredAt     : Date;
}

const ticketSchema = new Schema<ITicketDocument>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration', required: true, unique: true },
    qrCode        : { type: String, required: true, unique: true },
    status        : { 
      type   : String,
      enum   : ['ISSUED', 'CHECKED_IN', 'EXPIRED', 'CANCELLED'],
      default: 'ISSUED'
    },
    issuedAt : { type: Date, default: Date.now },
    expiredAt: { type: Date, required: true },
  },
  { collection: 'tickets' }
);

ticketSchema.index({ qrCode: 1 }, { name: 'idx_tickets_qrCode', unique: true });
ticketSchema.index({ registrationId: 1 }, { name: 'idx_tickets_registrationId', unique: true });
ticketSchema.index({ status: 1, expiredAt: 1 }, { name: 'idx_tickets_status_expiredAt' });

export const TicketModel = model<ITicketDocument>('Ticket', ticketSchema);