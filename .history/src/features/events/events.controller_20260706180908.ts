import { EventService } from "./events.service";
import { AppError } from "../../shared/errors/AppError";
import { sendSuccess } from "../../shared/utils/response.util";
import type { Request, Response, NextFunction } from "express";
import { CreateEventSchema, UpdateEventSchema } from "./dto/event.dto";
import {AddStaffSchema} from "./dto/add-staff.dto";

const eventService = new EventService();

export class EventController {
  // UC01 + UC04 — Danh sách event, hỗ trợ filter
  async getPublishedEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const { category, startFrom, startTo } = req.query;

      // Có filter → UC04
      if (category || startFrom || startTo) {
        const events = await eventService.filterEvents({
          category: category as string | undefined,
          startFrom: startFrom ? new Date(startFrom as string) : undefined,
          startTo: startTo ? new Date(startTo as string) : undefined,
        });
        return sendSuccess(res, events, "Filter events successfully");
      }

      // Không có filter → UC01
      const events = await eventService.getPublishedEvents(page, limit);
      sendSuccess(res, events, "Get events successfully");
    } catch (error) {
      next(error);
    }
  }

  // UC02 — Chi tiết 1 event
  async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventService.getEventById(req.params.id as string);
      sendSuccess(res, event, "Get event successfully");
    } catch (error) {
      next(error);
    }
  }

  // UC03 — Tìm kiếm
  async searchEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const keyword = req.query.q as string;
      const events = await eventService.searchEvents(keyword);
      sendSuccess(res, events, "Search events successfully");
    } catch (error) {
      next(error);
    }
  }

  // ───── UC13 — Organizer CRUD ─────

  // GET /api/v1/events/my — Danh sách events của organizer
  async getMyEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const organizerId = req.user!.id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const { events, total } = await eventService.getMyEvents(
        organizerId,
        page,
        limit,
      );
      sendSuccess(
        res,
        { events, total, page, limit },
        "Get my events successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/events — Tạo event mới
  async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = CreateEventSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        throw new AppError(error.details.map((d) => d.message).join(", "), 400);
      }
      const organizerId = req.user!.id;
      const event = await eventService.createEvent(organizerId, value);
      sendSuccess(res, event, "Event created successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/v1/events/:id — Cập nhật event
  async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = UpdateEventSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        throw new AppError(error.details.map((d) => d.message).join(", "), 400);
      }
      const organizerId = req.user!.id;
      const event = await eventService.updateEvent(
        req.params.id as string,
        organizerId,
        value,
      );
      sendSuccess(res, event, "Event updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/events/:id — Xóa event
  async deleteEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const organizerId = req.user!.id;
      await eventService.deleteEvent(req.params.id as string, organizerId);
      sendSuccess(res, null, "Event deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  //UC-19-20

  getEventReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;
      const requesterId = req.user!.id.toString(); // Lấy từ authMiddleware

      const report = await eventService.getEventReport(id, requesterId);
      sendSuccess(res, report, "Báo cáo sự kiện");
    } catch (err) {
      next(err);
    }
  };

  // Thêm vào events.controller.ts
  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;
      const snapshot = await eventService.getDashboardSnapshot(id);
      sendSuccess(res, snapshot, "Dashboard snapshot");
    } catch (err) {
      next(err);
    }
  };


  // ───── UC17 — Quản lý nhân viên check-in (Organizer) ─────

  async addStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const {error, value} = AddStaffSchema.validate(req.body, {
        abortEarly: false,
      })
      if (error) {
        throw new AppError(error.details.map((d) => d.message).join(", "), 400);
      }
      const eventId = req.params.id as string;
      const organizerId = req.user!.id;
      const {email} = value;

      const result = await eventService.addStaffToEvent(
          eventId,
          email,
          organizerId,
      );
      sendSuccess(res, result, "Thêm nhân viên thành công", 201);
    } catch (error) {
      next(error);
    }
  }


  async removeStaff(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Lấy id sự kiện và id nhân viên từ URL params
      const eventId = req.params.id as string;
      const staffId = req.params.staffId as string;

      // 2. Lấy ID của người đang thao tác
      const organizerId = req.user!.id;

      await eventService.removeStaffFromEvent(eventId, staffId, organizerId);

      sendSuccess(res, null, "Xóa nhân viên khỏi sự kiện thành công", 200);
    } catch (error) {
      next(error);
    }
  }


}


