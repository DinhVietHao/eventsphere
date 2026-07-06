import { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import { SubmitReviewSchema } from "./dto/reviews.dto";
import { ReviewsService } from "./reviews.service";
import { ReviewUser } from "./type/reviews.type";
import { sendSuccess } from "../../shared/utils/response.util";

export class ReviewsController {
  private reviewsService: ReviewsService;

  constructor() {
    this.reviewsService = new ReviewsService();
  }

  async submitReview(req: Request, res: Response, next: NextFunction) {
    const eventId = req.params.eventId;
    try {
      const { error, value } = SubmitReviewSchema.validate(
        {
          eventId,
          rating: req.body.rating,
          comment: req.body.comment,
        },
        { abortEarly: false, stripUnknown: true },
      );
      if (error) {
        throw new AppError(
          error.details.map((detail) => detail.message).join(", "),
          400,
        );
      }
      const result = await this.reviewsService.submitReview(
        req.user as ReviewUser,
        value,
      );

      return sendSuccess(res, result, "Submit review successfully");
    } catch (err) {
      next(err);
    }
  }
}
