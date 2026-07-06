import { Types } from "mongoose";
import { IReviewDocument, ReviewModel } from "../models/review.model";

export interface ReviewInput {
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  rating: number;
  comment?: string | null;
  reviewedAt?: Date;
}

export class ReviewsRepository {
  async findByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<IReviewDocument | null> {
    return ReviewModel.findOne({
      eventId: new Types.ObjectId(eventId),
      userId: new Types.ObjectId(userId),
    } as any);
  }

  async createReview(data: ReviewInput): Promise<IReviewDocument> {
    return ReviewModel.create(data as any);
  }

  async updateReview(
    reviewId: string,
    data: Partial<Pick<ReviewInput, "rating" | "comment" | "reviewedAt">> & {
      hasEdited?: boolean;
    },
  ): Promise<IReviewDocument | null> {
    return ReviewModel.findByIdAndUpdate(
      reviewId,
      { $set: data },
      { new: true, runValidators: true, strict: false },
    );
  }

  async findByEvent(eventId: string) {
    return ReviewModel.find({ eventId: new Types.ObjectId(eventId) } as any)
      .populate("userId", "name avatar")
      .sort({ reviewedAt: -1 })
      .lean();
  }

  async hasReviewBeenEdited(reviewId: string): Promise<boolean> {
    const review = await ReviewModel.collection.findOne(
      { _id: new Types.ObjectId(reviewId) },
      { projection: { hasEdited: 1 } },
    );

    return Boolean(review?.hasEdited);
  }
}
