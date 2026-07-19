import { Router } from "express";
import { EventController } from "./events.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { roleMiddleware } from "../../shared/middlewares/role.middleware";
import ticketTypesRouter from "../ticketTypes/ticketTypes.router";

const eventsRouter = Router();
const eventController = new EventController();

// ───── Guest ─────
eventsRouter.get("/search", eventController.searchEvents);
eventsRouter.get(
  "/my",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventController.getMyEvents,
);
eventsRouter.get("/", eventController.getPublishedEvents);
eventsRouter.get("/:id", eventController.getEventById);

// ───── Organizer ─────
eventsRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventController.createEvent,
);
eventsRouter.put(
  "/:id",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventController.updateEvent,
);
eventsRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventController.deleteEvent,
);

// ───── UC17 — Quản lý nhân viên check-in (Organizer) ─────
eventsRouter.post(
  "/:id/staffs",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventController.addStaff,
);

eventsRouter.delete(
  "/:id/staffs/:staffId",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventController.removeStaff,
);

// ───── Placeholder ─────
// ───── UC15 — Xem danh sách đăng ký ─────
eventsRouter.get(
  "/:id/registrations",
  authMiddleware,
  roleMiddleware("organizer", "admin"),
  eventController.getRegistrations,
);

eventsRouter.get("/:id/export", (req, res) =>
  res.json({ message: "UC18 - Export attendee CSV" }),
);
eventsRouter.get(
  "/:id/report",
  authMiddleware,
  roleMiddleware("organizer"),
  eventController.getEventReport,
);
eventsRouter.get(
  "/:id/dashboard",
  authMiddleware,
  roleMiddleware("organizer"),
  eventController.getDashboard,
);

eventsRouter.use("/:eventId/ticket-types", ticketTypesRouter);

export default eventsRouter;
