import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../shared/utils/jwt.util";

import authViewsRouter from "./views.auth.router";
import eventsViewsRouter from "./views.events.router";
import organizerViewsRouter from "./views.organizer.router";
import ticketsViewsRouter from "./views.ticket.router";

const viewsRouter = Router();

// Middleware đọc user từ cookie — optional, không block request
viewsRouter.use((req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken;
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.id, role: payload.role, name: payload.name };
    }
  } catch (_) {
    // Token hết hạn hoặc invalid → bỏ qua, user = null
  }
  next();
});

viewsRouter.use("/", authViewsRouter);
viewsRouter.use("/", eventsViewsRouter);
viewsRouter.use("/", organizerViewsRouter);
viewsRouter.use("/", ticketsViewsRouter);

export default viewsRouter;
