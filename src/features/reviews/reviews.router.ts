import { Router } from 'express';
const reviewsRouter = Router();
reviewsRouter.post('/', (req, res) => res.json({ message: 'UC11 - Review event (Tính lại avgRating bằng Mongoose Middleware)' }));
export default reviewsRouter;