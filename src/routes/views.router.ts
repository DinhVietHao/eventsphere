import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../shared/utils/jwt.util";
import { UserRepository } from "../features/auth/repositories/user.repository";

import authViewsRouter from "./views.auth.router";
import eventsViewsRouter from "./views.events.router";
import reviewsViewsRouter from "./views.reviews.router";
import organizerViewsRouter from "./views.organizer.router";
import ticketsViewsRouter from "./views.ticket.router";
import adminViewsRouter from "./views.admin.router";
import checkinViewsRouter from "./views.checkin.router";

const viewsRouter = Router();
const userRepository = new UserRepository();

viewsRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken;
    if (token) {
      const payload = verifyAccessToken(token);
      const user = await userRepository.findById(payload.id);

      if (user && user.isActive) {
        req.user = { id: user._id.toString(), role: user.role, name: user.name };
      } else {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
      }
    }
  } catch (_) {
    // Invalid or expired token is ignored for public views.
  }
  next();
});

viewsRouter.use("/", authViewsRouter);
viewsRouter.use("/", reviewsViewsRouter);
viewsRouter.use("/", eventsViewsRouter);
viewsRouter.use("/", organizerViewsRouter);
viewsRouter.use("/", ticketsViewsRouter);
viewsRouter.use("/", adminViewsRouter);
viewsRouter.use("/", checkinViewsRouter);

export default viewsRouter;
