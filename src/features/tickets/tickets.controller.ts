import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../shared/utils/response.util";
import { RegisterAttendanceSchema } from "./dto/registration.dto";
import { TicketsService } from "./tickets.service";

export class TicketsController {
    private ticketsService: TicketsService;

    constructor() {
        this.ticketsService = new TicketsService();
    }

    async registerAttendance(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const { error, value } = RegisterAttendanceSchema.validate(req.body, {
                abortEarly: false,
            });

            if (error) {
                res.status(400).json({
                    success: false,
                    data: null,
                    message: "Validation failed",
                    error: error.details.map((detail) => detail.message),
                });
                return;
            }

            const attendeeId = req.user!.id;
            const data = await this.ticketsService.registerAttendance(attendeeId, value);

            sendSuccess(res, data, "Đăng ký vé sự kiện thành công", 201);
        } catch (error) {
            next(error);
        }
    };

    async viewTicketDetail(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const ticketId = req.params.id as string;
            const attendeeId = req.user!.id;
            const ticket = await this.ticketsService.getTicketDetail(ticketId, attendeeId);
            sendSuccess(res, ticket, "Chi tiết vé sự kiện", 200);
        } catch (error) {
            next(error);
        }
    };
}
