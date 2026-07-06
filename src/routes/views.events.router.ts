import { Router } from "express";
import { Request, Response } from "express";
import { EventService } from "../features/events/events.service";
import { TicketTypeService } from "../features/ticketTypes/ticketTypes.service";
import { TicketsService } from "../features/tickets/tickets.service";
import { PaymentService } from "../features/payment/payment.service";
import { ReviewsService } from "../features/reviews/reviews.service";

const eventsViewsRouter = Router();
const eventService = new EventService();
const ticketTypeService = new TicketTypeService();
const ticketsService = new TicketsService();
const paymentService = new PaymentService();
const reviewsService = new ReviewsService();

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
// UC07 - Show ticket selection form.
eventsViewsRouter.get("/events/:id/booking", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      req.flash("error", "Vui lòng đăng nhập để đăng ký tham dự sự kiện.");
      return res.redirect("/login");
    }

    if (req.user.role !== "attendee") {
      req.flash("error", "Chỉ tài khoản attendee mới có thể đăng ký tham dự.");
      return res.redirect(`/events/${req.params.id}`);
    }

    const event = await eventService.getEventById(req.params.id as string);
    const ticketTypes = await ticketTypeService.getTicketTypes(req.params.id as string);
    const registrationResult = await ticketsService.getExistingBookingResult(
      req.user.id as string,
      req.params.id as string,
    );

    return res.render("events/booking", {
      event,
      ticketTypes,
      selectedTicketTypeId: registrationResult?.registration?.ticketTypeId || null,
      registrationResult,
      error: null,
      user: req.user || null,
      messages: req.flash(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return res.status(500).render("events/booking", {
      event: null,
      ticketTypes: [],
      selectedTicketTypeId: null,
      registrationResult: null,
      error: message,
      user: req.user || null,
      messages: req.flash(),
    });
  }
});

// UC07 - Submit attendance registration from web view.
eventsViewsRouter.post("/events/:id/booking", async (req: Request, res: Response) => {
  const eventId = req.params.id as string;

  try {
    if (!req.user) {
      req.flash("error", "Vui lòng đăng nhập để đăng ký tham dự sự kiện.");
      return res.redirect("/login");
    }

    if (req.user.role !== "attendee") {
      req.flash("error", "Chỉ tài khoản attendee mới có thể đăng ký tham dự.");
      return res.redirect(`/events/${eventId}`);
    }

    const ticketTypeId = req.body.ticketTypeId as string;
    const registrationResult = await ticketsService.registerAttendance(req.user.id as string, {
      eventId,
      ticketTypeId,
    });

    if (registrationResult.nextStep === "payment_required") {
      const ipAddr =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.socket.remoteAddress ||
        "127.0.0.1";

      const payment = await paymentService.createVNPayPaymentUrl({
        attendeeId: req.user.id as string,
        registrationId: registrationResult.registration._id.toString(),
        bankCode: "NCB",
        language: "vn",
        ipAddr,
      });

      return res.redirect(payment.paymentUrl);
    }

    const event = await eventService.getEventById(eventId);
    const ticketTypes = await ticketTypeService.getTicketTypes(eventId);

    return res.render("events/booking", {
      event,
      ticketTypes,
      selectedTicketTypeId: ticketTypeId,
      registrationResult,
      error: null,
      user: req.user || null,
      messages: req.flash(),
    });
  } catch (err) {
    const statusCode =
      typeof err === "object" &&
        err !== null &&
        "statusCode" in err &&
        typeof err.statusCode === "number"
        ? err.statusCode
        : 400;
    const message = err instanceof Error ? err.message : "Đăng ký tham dự thất bại";
    const event = await eventService.getEventById(eventId);
    const ticketTypes = await ticketTypeService.getTicketTypes(eventId);

    return res.status(statusCode).render("events/booking", {
      event,
      ticketTypes,
      selectedTicketTypeId: req.body.ticketTypeId || null,
      registrationResult: null,
      error: message,
      user: req.user || null,
      messages: req.flash(),
    });
  }
});

eventsViewsRouter.get("/events/:id", async (req: Request, res: Response) => {
  try {
    const event = await eventService.getEventById(req.params.id as string);
    const ticketTypes = await ticketTypeService.getTicketTypes(req.params.id as string);
    const reviewContext = await reviewsService.getEventReviewContext(
      req.params.id as string,
      req.user,
    );
    const prices = ticketTypes.map(ticket => ticket.price);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    res.render("events/detail", {
      event,
      minPrice,
      maxPrice,
      ...reviewContext,
      user: req.user || null,
      messages: req.flash(),
      reviewSuccess: req.query.review === "success",
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

export default eventsViewsRouter;
