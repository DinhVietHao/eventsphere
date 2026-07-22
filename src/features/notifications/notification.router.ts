import { Router } from "express";
import { notificationController } from "./notification.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { roleMiddleware } from "../../shared/middlewares/role.middleware";

const notificationRouter = Router();

// POST /api/v1/notifications — UC16: Gửi thông báo hàng loạt
notificationRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  notificationController.sendMassNotification,
);

// GET /api/v1/notifications — Lấy lịch sử gửi thông báo
notificationRouter.get(
  "/",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  notificationController.getSentHistory,
);

export default notificationRouter;
