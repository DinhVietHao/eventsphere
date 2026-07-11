import { Router } from "express";
import { adminController } from "./admin.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { roleMiddleware } from "../../shared/middlewares/role.middleware";

const adminRouter = Router();

const adminGuard = [authMiddleware, roleMiddleware("admin")];

// UC25 - Dashboard tong quan he thong
adminRouter.get("/dashboard", ...adminGuard, adminController.getDashboard);

// UC23 - Approve Event
adminRouter.get("/events/pending", ...adminGuard, adminController.getPendingEvents);
adminRouter.patch("/events/:eventId/approve", ...adminGuard, adminController.approveEvent);
adminRouter.patch("/events/:eventId/reject", ...adminGuard, adminController.rejectEvent);
adminRouter.get("/events/:eventId", ...adminGuard, adminController.getEventReviewDetail);

// Placeholder - UC24, UC26 implement sau
adminRouter.get("/users", ...adminGuard, (req, res) =>
  res.json({ message: "UC24 - Manage accounts" }),
);

// UC26 - View revenue report
adminRouter.get("/reports/revenue", ...adminGuard, adminController.getRevenueReport);

export default adminRouter;
