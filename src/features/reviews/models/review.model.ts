import { Schema, model, Document } from 'mongoose';
import { EventModel }              from '../../events/models/event.model';

export interface IReviewDocument extends Document {
  userId     : Schema.Types.ObjectId;
  eventId    : Schema.Types.ObjectId;
  rating     : number;
  comment   ?: string;
  reviewedAt : Date;
}

const reviewSchema = new Schema<IReviewDocument>(
  {
    userId    : { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId   : { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    rating    : { type: Number, required: true, min: 1, max: 5 },
    comment   : { type: String, default: null },
    reviewedAt: { type: Date, default: Date.now },
  },
  { collection: 'reviews' }
);

reviewSchema.index({ userId: 1, eventId: 1 }, { name: 'idx_reviews_unique', unique: true });
reviewSchema.index({ eventId: 1 }, { name: 'idx_reviews_eventId' });

// Mongoose Middleware: Đồng bộ hóa phi chuẩn tự động tính avgRating cho Event
reviewSchema.post('save', async function (this: IReviewDocument) {
  const Review = model('Review');
  
  const result = await Review.aggregate([
    { $match: { eventId: this.eventId } },
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ]);

  const finalAvg = result[0]?.avg ?? 0;

  await EventModel.findByIdAndUpdate(this.eventId, {
    avgRating: parseFloat(finalAvg.toFixed(1)),
  });
});

export const ReviewModel = model<IReviewDocument>('Review', reviewSchema);