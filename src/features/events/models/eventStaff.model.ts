import { Schema, model, Document } from 'mongoose';

export interface IEventStaffDocument extends Document {
  eventId   : Schema.Types.ObjectId;
  staffId   : Schema.Types.ObjectId;
  assignedBy: Schema.Types.ObjectId;
  assignedAt: Date;
}

const eventStaffSchema = new Schema<IEventStaffDocument>(
  {
    eventId   : { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    staffId   : { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
  },
  { collection: 'event_staff' }
);

eventStaffSchema.index({ eventId: 1, staffId: 1 }, { name: 'idx_event_staff_unique', unique: true });
eventStaffSchema.index({ eventId: 1 }, { name: 'idx_event_staff_eventId' });
eventStaffSchema.index({ staffId: 1 }, { name: 'idx_event_staff_staffId' });

export const EventStaffModel = model<IEventStaffDocument>('EventStaff', eventStaffSchema);