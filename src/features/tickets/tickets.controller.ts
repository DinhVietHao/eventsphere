import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError";
import { sendSuccess } from "../../shared/utils/response.util";
import { RegisterAttendanceSchema } from "./dto/registration.dto";
import { TicketsService } from "./tickets.service";

export class TicketsController {
  private ticketsService: TicketsService;

  constructor() {
    this.ticketsService = new TicketsService();
  }

  registerAttendance = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { error, value } = RegisterAttendanceSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        res.status(400).json({
          success: false,
          data: null,
          message: "Dữ liệu không hợp lệ",
          error: error.details.map((detail) => detail.message),
        });
        return;
      }

      const attendeeId = req.user!.id;
      const data = await this.ticketsService.registerAttendance(
        attendeeId,
        value,
      );

      sendSuccess(res, data, "Đăng ký vé sự kiện thành công", 201);
    } catch (error) {
      next(error);
    }
  };

  viewAttendanceHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const attendeeId = req.user!.id;
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);
      const history = await this.ticketsService.getAttendanceHistory(
        attendeeId,
        page,
        limit,
      );

      sendSuccess(res, history, "Lịch sử vé của tôi", 200);
    } catch (error) {
      next(error);
    }
  };

  viewTicketDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const ticketId = req.params.id as string;
      if (!ticketId) {
        throw new AppError("Mã vé là bắt buộc.", 400);
      }

      const attendeeId = req.user!.id;
      const ticket = await this.ticketsService.getTicketDetail(
        ticketId,
        attendeeId,
      );
      sendSuccess(res, ticket, "Chi tiết vé sự kiện", 200);
    } catch (error) {
      next(error);
    }
  };
}
