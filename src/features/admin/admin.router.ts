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

// UC24 - Manage Accounts
adminRouter.get("/accounts", ...adminGuard, adminController.getAccounts);
adminRouter.get("/accounts/:userId", ...adminGuard, adminController.getAccountDetail);
adminRouter.post("/accounts/:userId/lock", ...adminGuard, adminController.lockAccount);
adminRouter.post("/accounts/:userId/unlock", ...adminGuard, adminController.unlockAccount);

// UC26 - View revenue report
adminRouter.get("/reports/revenue", ...adminGuard, adminController.getRevenueReport);

export default adminRouter;
