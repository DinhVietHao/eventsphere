import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { roleMiddleware } from "../../shared/middlewares/role.middleware";
import { TicketsController } from "./tickets.controller";

const registrationRouter = Router();
const ticketsController = new TicketsController();

registrationRouter.post(
  "/",
  authMiddleware,
  roleMiddleware("attendee"),
  ticketsController.registerAttendance,
);

export default registrationRouter;
