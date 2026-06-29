import { Router } from "express";
import { Request, Response } from "express";
import { EventService } from "../features/events/events.service";

const eventsViewsRouter = Router();
const eventService = new EventService();

const LIMIT = 9;

// UC01 + UC04 — Danh sách + lọc
eventsViewsRouter.get("/events", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const category = req.query.category as string | undefined;
    const startFrom = req.query.startFrom as string | undefined;
    const startTo = req.query.startTo as string | undefined;
    const hasFilter = category || startFrom || startTo;

    const [events, total] = await Promise.all([
      hasFilter
        ? eventService.filterEvents({
            category,
            startFrom: startFrom ? new Date(startFrom) : undefined,
            startTo: startTo ? new Date(startTo) : undefined,
          })
        : eventService.getPublishedEvents(page, LIMIT),
      eventService.countPublishedEvents({ category }),
    ]);

    res.render("events/index", {
      events,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / LIMIT),
        limit: LIMIT,
      },
      user: req.user || null,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// UC03 — Tìm kiếm (đặt TRƯỚC /:id)
eventsViewsRouter.get("/events/search", async (req: Request, res: Response) => {
  try {
    const keyword = req.query.keyword as string;
    const events = keyword ? await eventService.searchEvents(keyword) : [];
    res.render("events/search", { events, keyword, user: req.user || null });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// UC02 — Chi tiết event
eventsViewsRouter.get("/events/:id", async (req: Request, res: Response) => {
  try {
    const event = await eventService.getEventById(req.params.id as string);
    res.render("events/detail", { event, user: req.user || null });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

export default eventsViewsRouter;
