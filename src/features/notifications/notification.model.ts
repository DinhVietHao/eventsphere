import { Schema, model, Document, Types } from "mongoose";

export interface INotificationLog extends Document {
  organizerId: Types.ObjectId;
  eventId: Types.ObjectId;
  eventTitle: string;
  subject: string;
  totalQueued: number;
  sentAt: Date;
}

const notificationLogSchema = new Schema<INotificationLog>(
  {
    organizerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    eventTitle: { type: String, required: true },
    subject: { type: String, required: true },
    totalQueued: { type: Number, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { collection: "notification_logs" },
);

notificationLogSchema.index({ organizerId: 1, sentAt: -1 });

export const NotificationLog = model<INotificationLog>(
  "NotificationLog",
  notificationLogSchema,
);
