// src/features/events/events.controller.ts
import { Request, Response, NextFunction } from "express";
import { eventsService } from "./events.service";
import { sendSuccess } from "../../shared/utils/response.util";

export class EventsController {
  getEventReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;
      const requesterId = req.user!._id.toString(); // Lấy từ authMiddleware

      const report = await eventsService.getEventReport(id, requesterId);
      sendSuccess(res, report, "Báo cáo sự kiện");
    } catch (err) {
      next(err);
    }
  };

  // Thêm vào events.controller.ts
  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;
      const snapshot = await eventsService.getDashboardSnapshot(id);
      sendSuccess(res, snapshot, "Dashboard snapshot");
    } catch (err) {
      next(err);
    }
  };
}

export const eventsController = new EventsController();
