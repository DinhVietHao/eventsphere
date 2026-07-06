import { Router } from "express";
import { Request, Response } from "express";
import { ReviewsService } from "../features/reviews/reviews.service";
import { ReviewUser } from "../features/reviews/type/reviews.type";

const reviewsViewsRouter = Router();
const reviewsService = new ReviewsService();

reviewsViewsRouter.post("/reviews/events/:eventId", async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  try {
    await reviewsService.submitReview(req.user as ReviewUser, {
      eventId,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return res.redirect(`/events/${req.params.eventId}?review=success`);
  } catch (error) {
    res.status(500).send("Server error");
  }
});

export default reviewsViewsRouter;
