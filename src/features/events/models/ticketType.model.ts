import { Schema, model, Document } from 'mongoose';

export interface ITicketTypeDocument extends Document {
  eventId     : Schema.Types.ObjectId;
  name        : string;
  price       : number;
  quota       : number;
  sold        : number;
  description?: string;
}

const ticketTypeSchema = new Schema<ITicketTypeDocument>(
  {
    eventId    : { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    name       : { type: String, required: true },
    price      : { type: Number, required: true, min: 0 },
    quota      : { type: Number, required: true, min: 1 },
    sold       : { type: Number, default: 0 },
    description: { type: String, default: null },
  },
  { collection: 'ticket_types' }
);

ticketTypeSchema.index({ eventId: 1 }, { name: 'idx_ticket_types_eventId' });

export const TicketTypeModel = model<ITicketTypeDocument>('TicketType', ticketTypeSchema);