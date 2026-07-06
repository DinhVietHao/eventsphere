import { Schema, model, Document, Types } from 'mongoose';

export interface ITicketType extends Document {
  eventId: Types.ObjectId;
  name: string;
  price: number;
  quota: number;
  sold: number;
  description?: string;
}

const ticketTypeSchema = new Schema<ITicketType>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quota: { type: Number, required: true, min: 1 },
    sold: { type: Number, default: 0 },
    description: { type: String, default: null },
  },
  { collection: 'ticket_types' }
);

ticketTypeSchema.index({ eventId: 1 }, { name: 'idx_ticket_types_eventId' });
ticketTypeSchema.index({ eventId: 1, sold: 1, quota: 1 }, { name: 'idx_ticket_types_quota' });

export const TicketType = model<ITicketType>('TicketType', ticketTypeSchema);