import { Schema, model, Document } from 'mongoose';

export interface ICheckinLogDocument extends Document {
  ticketId : Schema.Types.ObjectId;
  eventId  : Schema.Types.ObjectId;
  staffId  : Schema.Types.ObjectId;
  checkedAt: Date;
  method   : 'qr_scan' | 'manual';
}

const checkinLogSchema = new Schema<ICheckinLogDocument>(
  {
    ticketId : { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    eventId  : { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    staffId  : { type: Schema.Types.ObjectId, ref: 'User', required: true },
    checkedAt: { type: Date, default: Date.now },
    method   : { type: String, enum: ['qr_scan', 'manual'], required: true },
  },
  { collection: 'checkin_logs' }
);

checkinLogSchema.index({ eventId: 1, checkedAt: -1 }, { name: 'idx_checkin_event_time' });

export const CheckinLogModel = model<ICheckinLogDocument>('CheckinLog', checkinLogSchema);