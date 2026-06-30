import type { Request, Response, NextFunction } from "express";
import { TicketTypeService } from "./ticketTypes.service";
import { AppError } from "../../shared/errors/AppError";
import { sendSuccess } from "../../shared/utils/response.util";
import { CreateTicketTypeSchema, UpdateTicketTypeSchema } from "./dto/ticketType.dto";

const ticketTypeService = new TicketTypeService();

export class TicketTypeController {
  async getTicketTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const ticketTypes = await ticketTypeService.getTicketTypes(req.params.eventId as String);
      sendSuccess(res, ticketTypes, "Get ticket types successfully");
    } catch (error) { next(error); }
  }

  async createTicketType(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = CreateTicketTypeSchema.validate(req.body, { abortEarly: false });
      if (error) throw new AppError(error.details.map((d) => d.message).join(", "), 400);

      const ticketType = await ticketTypeService.createTicketType(
        req.params.eventId,
        req.user!.id,
        value,
      );
      sendSuccess(res, ticketType, "Ticket type created successfully", 201);
    } catch (error) { next(error); }
  }

  async updateTicketType(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = UpdateTicketTypeSchema.validate(req.body, { abortEarly: false });
      if (error) throw new AppError(error.details.map((d) => d.message).join(", "), 400);

      const ticketType = await ticketTypeService.updateTicketType(
        req.params.id,
        req.user!.id,
        value,
      );
      sendSuccess(res, ticketType, "Ticket type updated successfully");
    } catch (error) { next(error); }
  }

  async deleteTicketType(req: Request, res: Response, next: NextFunction) {
    try {
      await ticketTypeService.deleteTicketType(req.params.id, req.user!.id);
      sendSuccess(res, null, "Ticket type deleted successfully");
    } catch (error) { next(error); }
  }
}
