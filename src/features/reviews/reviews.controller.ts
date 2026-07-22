import { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import { sendSuccess } from "../../shared/utils/response.util";
import { SubmitReviewSchema } from "./dto/reviews.dto";
import { ReviewsService } from "./reviews.service";
import { ReviewUser } from "./type/reviews.type";

export class ReviewsController {
  private reviewsService: ReviewsService;

  constructor() {
    this.reviewsService = new ReviewsService();
  }

  submitReview = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { error, value } = SubmitReviewSchema.validate(
        {
          eventId: req.params.eventId || req.body.eventId,
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

      sendSuccess(res, result, "Submit review successfully");
    } catch (err) {
      next(err);
    }
  };
}
