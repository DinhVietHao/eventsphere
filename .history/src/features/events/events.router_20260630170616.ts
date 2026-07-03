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

// ───── Placeholder ─────
eventsRouter.get("/:id/registrations", (req, res) =>
  res.json({ message: "UC15 - View registration list" }),
);
eventsRouter.get("/:id/export", (req, res) =>
  res.json({ message: "UC18 - Export attendee CSV" }),
);
eventsRouter.get("/:id/report", (req, res) =>
  res.json({ message: "UC19 - View event report" }),
);
eventsRouter.get("/:id/dashboard", (req, res) =>
  res.json({ message: "UC20 - View realtime dashboard" }),
);

eventsRouter.use("/:eventId/ticket-types", ticketTypesRouter);


export default eventsRouter;
