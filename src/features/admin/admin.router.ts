import { Router } from "express";
import { adminController } from "./admin.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { roleMiddleware } from "../../shared/middlewares/role.middleware";

const adminRouter = Router();

const adminGuard = [authMiddleware, roleMiddleware("admin")];

// UC25 — Dashboard tổng quan hệ thống
adminRouter.get("/dashboard", ...adminGuard, adminController.getDashboard);

// Placeholder — UC23, UC24, UC26 implement sau
adminRouter.patch("/events/:id/approve", ...adminGuard, (req, res) =>
  res.json({ message: "UC23 - Approve event" }),
);
adminRouter.patch("/events/:id/reject", ...adminGuard, (req, res) =>
  res.json({ message: "UC23 - Reject event" }),
);
adminRouter.get("/users", ...adminGuard, (req, res) =>
  res.json({ message: "UC24 - Manage accounts" }),
);
adminRouter.get("/reports/revenue", ...adminGuard, (req, res) =>
  res.json({ message: "UC26 - Revenue report" }),
);

export default adminRouter;
