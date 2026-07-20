import { Request, Response, NextFunction, Router } from "express";
import { EventService } from "../features/events/events.service";
import { NotificationService } from "../features/notifications/notification.service";
import { TicketTypeService } from "../features/ticketTypes/ticketTypes.service";

const organizerViewsRouter = Router();
const eventService = new EventService();
const notificationService = new NotificationService();
const ticketTypeService = new TicketTypeService();

const LIMIT = 10;

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

// POST /organizer/events — tạo event mới + loại vé
organizerViewsRouter.post(
  "/organizer/events",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      // Validate các trường bắt buộc của event
      const missing: string[] = [];
      if (!req.body.title?.trim()) missing.push("Tên sự kiện");
      if (!req.body.description?.trim()) missing.push("Mô tả chi tiết");
      if (!req.body.category) missing.push("Danh mục");
      if (!req.body.location?.trim()) missing.push("Địa điểm");
      if (!req.body.startDate) missing.push("Ngày bắt đầu");
      if (!req.body.endDate) missing.push("Ngày kết thúc");
      if (missing.length > 0) {
        throw new Error(`Vui lòng điền đầy đủ: ${missing.join(", ")}`);
      }

      // Validate: phải có ít nhất 1 loại vé
      const names = [req.body.ticketName].flat().filter(Boolean);
      if (names.length === 0) {
        throw new Error("Vui lòng thêm ít nhất 1 loại vé");
      }

      // Tạo event trước
      const event = await eventService.createEvent(req.user!.id, req.body);

      // Tạo từng loại vé
      const prices = [req.body.ticketPrice].flat();
      const quotas = [req.body.ticketQuota].flat();
      const descriptions = [req.body.ticketDescription].flat();

      for (let i = 0; i < names.length; i++) {
        await ticketTypeService.createTicketType(
          (event._id as any).toString(),
          req.user!.id,
          {
            name: names[i],
            price: Number(prices[i]) || 0,
            quota: Number(quotas[i]) || 1,
            description: descriptions[i] || "",
          },
        );
      }

      (req as any).flash("success", "Tạo sự kiện và loại vé thành công!");
      res.redirect("/organizer/events");
    } catch (err: any) {
      const toArray = (v: unknown): string[] =>
        v === undefined ? [] : Array.isArray(v) ? (v as string[]) : [v as string];

      const ticketNames = toArray(req.body.ticketName);
      const ticketPrices = toArray(req.body.ticketPrice);
      const ticketQuotas = toArray(req.body.ticketQuota);
      const ticketDescriptions = toArray(req.body.ticketDescription);

      // Giữ lại các dòng loại vé người dùng đã nhập khi tạo event thất bại
      const tickets = ticketNames.map((name, i) => ({
        name,
        price: ticketPrices[i] ?? "",
        quota: ticketQuotas[i] ?? "",
        description: ticketDescriptions[i] ?? "",
      }));

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
          tickets,
        },
      });
    }
  },
);

// GET /organizer/events/:id — chi tiết event (đặt SAU /create)
organizerViewsRouter.get(
  "/organizer/events/:id",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const event = await eventService.getEventById(req.params.id as string);
      if (
        event.organizerId.toString() !== req.user!.id &&
        req.user!.role !== "admin"
      ) {
        return res
          .status(403)
          .render("errors/403", { layout: false, user: req.user });
      }
      const ticketTypes = await ticketTypeService.getTicketTypes(
        req.params.id as string,
      );
      res.render("organizer/events/show", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        ticketTypes,
      });
    } catch (err) {
      res.status(500).send("Server error");
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

// GET /organizer/events/:id/report — UC19 (chỉ khi ENDED hoặc endDate đã qua)
organizerViewsRouter.get(
  "/organizer/events/:id/report",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const event = await eventService.getEventById(req.params.id as string);

      // Kiểm tra sự kiện đã kết thúc chưa — theo status hoặc endDate
      const isEnded =
        event.status === "ENDED" ||
        event.status === "CANCELLED" ||
        new Date(event.endDate) < new Date();

      if (!isEnded) {
        (req as any).flash(
          "error",
          "Báo cáo tổng kết chỉ khả dụng sau khi sự kiện kết thúc.",
        );
        return res.redirect("/organizer/events");
      }

      const report = await eventService.getEventReport(
        req.params.id as string,
        req.user!.id,
      );
      res.render("organizer/events/report", {
        layout: "layouts/organizer",
        user: req.user,
        report,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send(err.message || "Server error");
    }
  },
);

// GET /organizer/events/:id/dashboard — UC20
organizerViewsRouter.get(
  "/organizer/events/:id/dashboard",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const snapshot = await eventService.getDashboardSnapshot(
        req.params.id as string,
      );
      res.render("organizer/events/dashboard", {
        layout: "layouts/organizer",
        user: req.user,
        snapshot,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send(err.message || "Server error");
    }
  },
);

// GET /organizer/events/:id/registrations — UC15
organizerViewsRouter.get(
  "/organizer/events/:id/registrations",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = 20;
      const event = await eventService.getEventById(req.params.id as string);
      const result = await eventService.getRegistrationsByEvent(
        req.params.id as string,
        req.user!.id,
        req.user!.role,
        page,
        limit,
      );
      res.render("organizer/events/registrations", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        registrations: result.registrations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.total / limit),
          limit,
        },
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send(err.message || "Server error");
    }
  },
);

// GET /organizer/notifications — UC16
organizerViewsRouter.get(
  "/organizer/notifications",
  ...organizerGuard,
  async (req: any, res: Response) => {
    try {
      const events = await eventService.getApprovedEvents(req.user!.id);
      const [messages, sentHistory] = [
        req.flash(),
        await notificationService.getSentHistory(req.user!.id),
      ];
      res.render("organizer/notifications", {
        layout: "layouts/organizer",
        user: req.user,
        events,
        sentHistory,
        messages: { success: messages.success, error: messages.error },
        old: null,
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
      const event = await eventService.getEventById(
        req.params.eventId as string,
      );
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
      const event = await eventService.getEventById(
        req.params.eventId as string,
      );
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

// POST /organizer/notifications/send — UC16 gửi thông báo
organizerViewsRouter.post(
  "/organizer/notifications/send",
  ...organizerGuard,
  async (req: any, res: Response) => {
    try {
      const { eventId, subject, message } = req.body;
      const result = await notificationService.sendMassNotification(
        eventId,
        subject,
        message,
        req.user!.id,
      );
      req.flash(
        "success",
        `Đã đưa vào hàng đợi gửi thông báo cho ${result.totalQueued} người thành công!`,
      );
      res.redirect("/organizer/notifications");
    } catch (err: any) {
      req.flash("error", err.message || "Gửi thông báo thất bại");
      res.redirect("/organizer/notifications");
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
        req.params.eventId as string,
        req.user!.id,
        req.body,
      );
      (req as any).flash("success", "Thêm loại vé thành công!");
      res.redirect(`/organizer/events/${req.params.eventId}/ticket-types`);
    } catch (err: any) {
      const event = await eventService.getEventById(
        req.params.eventId as string,
      );
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
      const event = await eventService.getEventById(
        req.params.eventId as string,
      );
      const ticketTypes = await ticketTypeService.getTicketTypes(
        req.params.eventId as string,
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
        req.params.id as string,
        req.user!.id,
        req.body,
      );
      (req as any).flash("success", "Cập nhật loại vé thành công!");
      res.redirect(`/organizer/events/${req.params.eventId}/ticket-types`);
    } catch (err: any) {
      const event = await eventService.getEventById(
        req.params.eventId as string,
      );
      const ticketTypes = await ticketTypeService.getTicketTypes(
        req.params.eventId as string,
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
      await ticketTypeService.deleteTicketType(
        req.params.id as string,
        req.user!.id,
      );
      (req as any).flash("success", "Xóa loại vé thành công!");
    } catch (err: any) {
      (req as any).flash("error", err.message || "Xóa thất bại");
    }
    res.redirect(`/organizer/events/${req.params.eventId}/ticket-types`);
  },
);

export default organizerViewsRouter;

// GET /organizer/events/:id/staffs — Giao diện quản lý UC17
organizerViewsRouter.get(
  "/organizer/events/:id/staffs",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.id as string;
      const organizerId = req.user!.id;

      const event = await eventService.getEventById(eventId);
      const staffs = await eventService.getStaffsByEventId(
        eventId,
        organizerId,
      );

      const messages = (req as any).flash();
      res.render("organizer/events/assignStaff", {
        layout: "layouts/organizer",
        user: req.user,
        event,
        staffs,
        error: messages.error || null,
        messages: { success: messages.success },
      });
    } catch (err: any) {
      res
        .status(err.statusCode || 500)
        .send(err.message || "Đã xảy ra lỗi hệ thống");
    }
  },
);

// POST /organizer/events/:id/staffs — Xử lý Thêm Staff
organizerViewsRouter.post(
  "/organizer/events/:id/staffs",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.id as string;
      const organizer = req.user!.id;
      const { email } = req.body;
      await eventService.addStaffToEvent(eventId, email, organizer);
      (req as any).flash("success", "Thêm nhân viên check-in thành công!");
      res.redirect(`/organizer/events/${req.params.id}/staffs`);
    } catch (err: any) {
      (req as any).flash("error", err.message || "Thêm nhân viên thất bại");
      res.redirect(`/organizer/events/${req.params.id}/staffs`);
    }
  },
);

// POST /organizer/events/:id/staffs/:staffId/delete — Xử lý Xóa Staff
organizerViewsRouter.post(
  "/organizer/events/:id/staffs/:staffId/delete",
  ...organizerGuard,
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.id as string;
      const staffId = req.params.staffId as string;
      const organizer = req.user!.id;
      await eventService.removeStaffFromEvent(eventId, staffId, organizer);
      (req as any).flash("success", "Xóa nhân viên thành công!");
      res.redirect(`/organizer/events/${req.params.id}/staffs`);
    } catch (err: any) {
      (req as any).flash("error", err.message || "Xóa nhân viên thất bại");
      res.redirect(`/organizer/events/${req.params.id}/staffs`);
    }
  },
);
