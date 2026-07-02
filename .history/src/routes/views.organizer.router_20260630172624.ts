import { Request, Response, NextFunction, Router } from "express";
import { EventService } from "../features/events/events.service";
import { TicketTypeService } from "../features/ticketTypes/ticketTypes.service";

const organizerViewsRouter = Router();
const eventService = new EventService();
const ticketTypeService = new TicketTypeService();

const LIMIT = 9;

// Middleware guard cho view — redirect
const requireLogin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.redirect("/login");
  }
  next();
};

const requireRole =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).render("errors/403", {
        layout: false,
        user: req.user || null,
      });
    }
    next();
  };

const organizerGuard = [requireLogin, requireRole("organizer", "admin")];

// GET /organizer/dashboard
organizerViewsRouter.get(
  "/organizer/dashboard",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const { events } = await eventService.getMyEvents(req.user!.id, 1, 100);
      res.render("organizer/dashboard", {
        layout: "layouts/organizer",
        user: req.user,
        events,
      });
    } catch (err) {
      res.status(500).send("Server error");
    }
  },
);

// GET /organizer/events
organizerViewsRouter.get(
  "/organizer/events",
  ...organizerGuard,
  async (req: any, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const { events, total } = await eventService.getMyEvents(
        req.user!.id,
        page,
        LIMIT,
      );
      const messages = req.flash();
      res.render("organizer/events/index", {
        layout: "layouts/organizer",
        user: req.user,
        events,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / LIMIT),
          limit: LIMIT,
        },
        messages: { success: messages.success, error: messages.error },
      });
    } catch (err) {
      res.status(500).send("Server error");
    }
  },
);

// GET /organizer/events/create — đặt TRƯỚC /:id
organizerViewsRouter.get(
  "/organizer/events/create",
  ...organizerGuard,
  (req: Request, res: Response) => {
    res.render("organizer/events/create", {
      layout: "layouts/organizer",
      user: req.user,
      error: null,
      old: null,
    });
  },
);

// POST /organizer/events — tạo event mới
organizerViewsRouter.post(
  "/organizer/events",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      await eventService.createEvent(req.user!.id, req.body);
      res.redirect("/organizer/events");
    } catch (err: any) {
      res.render("organizer/events/create", {
        layout: "layouts/organizer",
        user: req.user,
        error: err.message || "Tạo sự kiện thất bại",
        old: {
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          location: req.body.location,
          startDate: req.body.startDate,
          endDate: req.body.endDate,
        },
      });
    }
  },
);

// GET /organizer/events/:id/edit
organizerViewsRouter.get(
  "/organizer/events/:id/edit",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const event = await eventService.getEventById(req.params.id as string);
      res.render("organizer/events/edit", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        error: null,
      });
    } catch (err) {
      res.status(500).send("Server error");
    }
  },
);

// POST /organizer/events/:id/edit — cập nhật event
organizerViewsRouter.post(
  "/organizer/events/:id/edit",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      await eventService.updateEvent(
        req.params.id as string,
        req.user!.id,
        req.body,
      );
      res.redirect("/organizer/events");
    } catch (err: any) {
      const event = await eventService.getEventById(req.params.id as string);
      res.render("organizer/events/edit", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        error: err.message || "Cập nhật thất bại",
      });
    }
  },
);

// POST /organizer/events/:id/submit — gửi duyệt
organizerViewsRouter.post(
  "/organizer/events/:id/submit",
  ...organizerGuard,
  async (req: any, res: Response) => {
    try {
      await eventService.submitEvent(req.params.id as string, req.user!.id);
      (req as any).flash("success", "Đã gửi duyệt sự kiện thành công!");
      res.redirect("/organizer/events");
    } catch (err: any) {
      (req as any).flash("error", err.message || "Gửi duyệt thất bại");
      res.redirect("/organizer/events");
    }
  },
);

// POST /organizer/events/:id/delete — xóa event
organizerViewsRouter.post(
  "/organizer/events/:id/delete",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      await eventService.deleteEvent(req.params.id as string, req.user!.id);
      (req as any).flash("success", "Xóa sự kiện thành công!");
      res.redirect("/organizer/events");
    } catch (err: any) {
      (req as any).flash("error", err.message || "Xóa thất bại");
      res.redirect("/organizer/events");
    }
  },
);

// GET /organizer/events/:id/registrations
organizerViewsRouter.get(
  "/organizer/events/:id/registrations",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const event = await eventService.getEventById(req.params.id as string);
      res.render("organizer/events/registrations", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        registrations: [], // UC15 implement sau
      });
    } catch (err) {
      res.status(500).send("Server error");
    }
  },
);

// GET /organizer/events/:eventId/ticket-types
organizerViewsRouter.get(
  "/organizer/events/:eventId/ticket-types",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const event = await eventService.getEventById(req.params.eventId as string);
      const ticketTypes = await ticketTypeService.getTicketTypes(
        req.params.eventId as string,
      );
      const messages = (req as any).flash();
      res.render("organizer/events/ticket-types/index", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        ticketTypes,
        messages: { success: messages.success, error: messages.error },
      });
    } catch (err) {
      res.status(500).send("Server error");
    }
  },
);

// GET /organizer/events/:eventId/ticket-types/create
organizerViewsRouter.get(
  "/organizer/events/:eventId/ticket-types/create",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const event = await eventService.getEventById(req.params.eventId);
      res.render("organizer/events/ticket-types/create", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        error: null,
        old: null,
      });
    } catch (err) {
      res.status(500).send("Server error");
    }
  },
);

// POST /organizer/events/:eventId/ticket-types
organizerViewsRouter.post(
  "/organizer/events/:eventId/ticket-types",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      await ticketTypeService.createTicketType(
        req.params.eventId,
        req.user!.id,
        req.body,
      );
      (req as any).flash("success", "Thêm loại vé thành công!");
      res.redirect(`/organizer/events/${req.params.eventId}/ticket-types`);
    } catch (err: any) {
      const event = await eventService.getEventById(req.params.eventId);
      res.render("organizer/events/ticket-types/create", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        error: err.message || "Thêm loại vé thất bại",
        old: req.body,
      });
    }
  },
);

// GET /organizer/events/:eventId/ticket-types/:id/edit
organizerViewsRouter.get(
  "/organizer/events/:eventId/ticket-types/:id/edit",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const event = await eventService.getEventById(req.params.eventId);
      const ticketTypes = await ticketTypeService.getTicketTypes(
        req.params.eventId,
      );
      const ticketType = ticketTypes.find(
        (t) => t._id.toString() === req.params.id,
      );
      if (!ticketType) return res.status(404).send("Không tìm thấy loại vé");
      res.render("organizer/events/ticket-types/edit", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        ticketType,
        error: null,
      });
    } catch (err) {
      res.status(500).send("Server error");
    }
  },
);

// POST /organizer/events/:eventId/ticket-types/:id/edit
organizerViewsRouter.post(
  "/organizer/events/:eventId/ticket-types/:id/edit",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      await ticketTypeService.updateTicketType(
        req.params.id,
        req.user!.id,
        req.body,
      );
      (req as any).flash("success", "Cập nhật loại vé thành công!");
      res.redirect(`/organizer/events/${req.params.eventId}/ticket-types`);
    } catch (err: any) {
      const event = await eventService.getEventById(req.params.eventId);
      const ticketTypes = await ticketTypeService.getTicketTypes(
        req.params.eventId,
      );
      const ticketType = ticketTypes.find(
        (t) => t._id.toString() === req.params.id,
      );
      res.render("organizer/events/ticket-types/edit", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        ticketType,
        error: err.message || "Cập nhật thất bại",
      });
    }
  },
);

// POST /organizer/events/:eventId/ticket-types/:id/delete
organizerViewsRouter.post(
  "/organizer/events/:eventId/ticket-types/:id/delete",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      await ticketTypeService.deleteTicketType(req.params.id, req.user!.id);
      (req as any).flash("success", "Xóa loại vé thành công!");
    } catch (err: any) {
      (req as any).flash("error", err.message || "Xóa thất bại");
    }
    res.redirect(`/organizer/events/${req.params.eventId}/ticket-types`);
  },
);

export default organizerViewsRouter;
