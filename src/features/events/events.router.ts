import { Router } from "express";
import { eventsController } from "./events.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { roleMiddleware } from "../../shared/middlewares/role.middleware";

const eventsRouter = Router();

// Guest UCs (Không cần token)
eventsRouter.get("/", (req, res) =>
  res.json({ message: "UC01 - Browse event list & UC04 - Filter events" }),
);
eventsRouter.get("/search", (req, res) =>
  res.json({ message: "UC03 - Search events" }),
);
eventsRouter.get("/:id", (req, res) =>
  res.json({ message: "UC02 - View event details" }),
);

// Organizer UCs (Cần authMiddleware & roleMiddleware('organizer'))
eventsRouter.post("/", (req, res) =>
  res.json({ message: "UC13 - Create event & UC14 - Manage ticket types" }),
);
eventsRouter.put("/:id", (req, res) =>
  res.json({ message: "UC13 - Update event" }),
);
eventsRouter.get("/:id/registrations", (req, res) =>
  res.json({ message: "UC15 - View registration list" }),
);
eventsRouter.get("/:id/export", (req, res) =>
  res.json({ message: "UC18 - Export attendee CSV" }),
);
eventsRouter.get(
  "/:id/report",
  authMiddleware,
  roleMiddleware("organizer"),
  eventsController.getEventReport,
);
eventsRouter.get("/:id/dashboard", (req, res) =>
  res.json({ message: "UC20 - View realtime dashboard (Socket.io)" }),
);

export default eventsRouter;
