import { Router } from "express";
import { TicketTypeController } from "./ticketTypes.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { roleMiddleware } from "../../shared/middlewares/role.middleware";

const ticketTypesRouter = Router({ mergeParams: true }); // quan trọng!
const ticketTypeController = new TicketTypeController();

// Public — ai cũng xem được loại vé của event
ticketTypesRouter.get("/", ticketTypeController.getTicketTypes);

// Organizer only
ticketTypesRouter.post("/", authMiddleware, roleMiddleware("organizer", "admin"), ticketTypeController.createTicketType);
ticketTypesRouter.put("/:id", authMiddleware, roleMiddleware("organizer", "admin"), ticketTypeController.updateTicketType);
ticketTypesRouter.delete("/:id", authMiddleware, roleMiddleware("organizer", "admin"), ticketTypeController.deleteTicketType);

export default ticketTypesRouter;
