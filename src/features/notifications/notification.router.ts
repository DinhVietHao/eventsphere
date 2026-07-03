import { Router } from "express";
import { notificationController } from "./notification.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { roleMiddleware } from "../../shared/middlewares/role.middleware";

const notificationRouter = Router();

// POST /api/v1/notifications/:eventId/send
notificationRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  notificationController.sendMassNotification,
);

export default notificationRouter;
