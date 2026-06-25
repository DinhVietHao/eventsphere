import { EventService } from "./events.service";
import { sendSuccess } from "../../shared/utils/response.util";
import type { Request, Response, NextFunction } from 'express';

const eventService = new EventService();

export class EventController {

    // UC01 + UC04 — Danh sách event, hỗ trợ filter
    async getPublishedEvents(req: Request, res: Response, next: NextFunction) {
        try {
            const page  = Number(req.query.page)  || 1;
            const limit = Number(req.query.limit) || 10;
            const { category, startFrom, startTo } = req.query;

            // Có filter → UC04
            if (category || startFrom || startTo) {
                const events = await eventService.filterEvents({
                    category  : category  as string | undefined,
                    startFrom : startFrom ? new Date(startFrom as string) : undefined,
                    startTo   : startTo   ? new Date(startTo   as string) : undefined,
                });
                return sendSuccess(res, events, 'Filter events successfully');
            }

            // Không có filter → UC01
            const events = await eventService.getPublishedEvents(page, limit);
            sendSuccess(res, events, 'Get events successfully');
        } catch (error) {
            next(error);
        }
    }

    // UC02 — Chi tiết 1 event
    async getEventById(req: Request, res: Response, next: NextFunction) {
        try {
            const event = await eventService.getEventById(req.params.id as string);
            sendSuccess(res, event, 'Get event successfully');
        } catch (error) {
            next(error);
        }
    }

    // UC03 — Tìm kiếm
    async searchEvents(req: Request, res: Response, next: NextFunction) {
        try {
            const keyword = req.query.q as string;
            const events  = await eventService.searchEvents(keyword);
            sendSuccess(res, events, 'Search events successfully');
        } catch (error) {
            next(error);
        }
    }

}