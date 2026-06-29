import { Router } from "express";
import { EventService } from "../features/events/events.service";

const viewsRouter = Router();
const eventService = new EventService();
const LIMIT = 9;

// UC01 + UC04 — Danh sách + lọc
viewsRouter.get("/events", async (req: any, res: any) => {
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

// UC03 — Tìm kiếm
viewsRouter.get("/events/search", async (req: any, res: any) => {
  try {
    const keyword = req.query.keyword as string;
    const events = keyword ? await eventService.searchEvents(keyword) : [];
    res.render("events/search", { events, keyword, user: req.user || null });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// UC02 — Chi tiết event
viewsRouter.get("/events/:id", async (req: any, res: any) => {
  try {
    const event = await eventService.getEventById(req.params.id as string);
    res.render("events/detail", { event, user: req.user || null });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

export default viewsRouter;
