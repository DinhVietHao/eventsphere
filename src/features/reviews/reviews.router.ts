import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleMiddleware } from '../../shared/middlewares/role.middleware';
import { ReviewsController } from './reviews.controller';
const reviewsRouter = Router();
const reviewsController = new ReviewsController();
reviewsRouter.post('/', authMiddleware, roleMiddleware('attendee'), reviewsController.submitReview);
export default reviewsRouter;