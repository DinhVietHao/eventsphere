import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { notificationService } from "./notification.service";
import { sendSuccess } from "../../shared/utils/response.util";

const SendNotificationSchema = Joi.object({
  eventId: Joi.string().length(24).hex().required(),
  subject: Joi.string().min(1).max(200).required(),
  message: Joi.string().min(1).max(2000).required(),
});

export class NotificationController {
  sendMassNotification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { error, value } = SendNotificationSchema.validate(req.body);
      if (error) {
        res
          .status(400)
          .json({ success: false, message: error.details[0].message });
        return;
      }

      const { eventId, subject, message } = value;
      const organizerId = req.user!.id;
      const result = await notificationService.sendMassNotification(
        eventId,
        subject,
        message,
        organizerId,
      );

      sendSuccess(
        res,
        result,
        `Đã đưa vào hàng đợi gửi cho ${result.totalQueued} người`,
      );
    } catch (err) {
      next(err);
    }
  };

  // GET /api/v1/notifications
  getSentHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizerId = req.user!.id;
      const history = await notificationService.getSentHistory(organizerId);
      sendSuccess(res, history, "Lấy lịch sử gửi thông báo thành công");
    } catch (err) {
      next(err);
    }
  };
}

export const notificationController = new NotificationController();
