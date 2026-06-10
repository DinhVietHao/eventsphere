import { Schema, model, Document } from 'mongoose';

export interface IEventDocument extends Document {
  title           : string;
  description     : string;
  category        : 'music' | 'tech' | 'sport' | 'education';
  location        : string;
  startDate       : Date;
  endDate         : Date;
  status          : 'DRAFT' | 'PENDING' | 'APPROVED' | 'ONGOING' | 'ENDED' | 'CANCELLED';
  bannerUrl       : string;
  organizerId     : Schema.Types.ObjectId;
  avgRating       : number;
  attendeeCount   : number;
  rejectionReason?: string;
  createdAt       : Date;
  updatedAt       : Date;
}

const eventSchema = new Schema<IEventDocument>(
  {
    title      : { type: String, required: true },
    description: { type: String, required: true },
    category   : { 
      type    : String,
      enum    : ['music', 'tech', 'sport', 'education'],
      required: true
    },
    location : { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate  : { type: Date, required: true },
    status   : { 
      type   : String,
      enum   : ['DRAFT', 'PENDING', 'APPROVED', 'ONGOING', 'ENDED', 'CANCELLED'],
      default: 'DRAFT'
    },
    bannerUrl      : { type: String, required: true },
    organizerId    : { type: Schema.Types.ObjectId, ref: 'User', required: true },
    avgRating      : { type: Number, default: 0 },
    attendeeCount  : { type: Number, default: 0 },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true, collection: 'events' }
);

eventSchema.index({ title: 'text', description: 'text' }, { name: 'idx_events_search' });
eventSchema.index({ category: 1, status: 1, startDate: 1 }, { name: 'idx_events_filter' });
eventSchema.index({ organizerId: 1 }, { name: 'idx_events_organizerId' });

export const EventModel = model<IEventDocument>('Event', eventSchema);