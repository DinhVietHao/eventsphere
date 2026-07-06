import { Schema, model, Document } from 'mongoose';
import { Event } from '../../events/models/event.model';

export interface IReviewDocument extends Document {
  userId: Schema.Types.ObjectId;
  eventId: Schema.Types.ObjectId;
  rating: number;
  comment?: string;
  reviewedAt: Date;
  hasEdited: boolean;
}

const reviewSchema = new Schema<IReviewDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null },
    hasEdited: { type: Boolean, default: false },
    reviewedAt: { type: Date, default: Date.now },
  },
  { collection: 'reviews' }
);

reviewSchema.index({ userId: 1, eventId: 1 }, { name: 'idx_reviews_unique', unique: true });
reviewSchema.index({ eventId: 1 }, { name: 'idx_reviews_eventId' });

// Mongoose Middleware: Đồng bộ hóa phi chuẩn tự động tính avgRating cho Event
async function syncEventRating(eventId: Schema.Types.ObjectId) {
  const Review = model("Review");
  const result = await Review.aggregate([
    { $match: { eventId } },
    {
      $group: {
        _id: "$eventId",
        avg: { $avg: "$rating" }
      },
    },
  ]);
  const avgRating = result[0]?.avg ?? 0;
  await Event.findByIdAndUpdate(eventId, {
    avgRating: Number(avgRating.toFixed(1))
  });
}

reviewSchema.post("save", async function (this: IReviewDocument) {
  await syncEventRating(this.eventId);
});

reviewSchema.post("findOneAndUpdate", async function (doc: IReviewDocument | null) {
  if (!doc) return;
  await syncEventRating(doc.eventId);
});

export const ReviewModel = model<IReviewDocument>('Review', reviewSchema);