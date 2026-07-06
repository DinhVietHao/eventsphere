import { Router, Request, Response, NextFunction } from "express";
import { adminService } from "../features/admin/admin.service";

const adminViewsRouter = Router();

// Guards
const requireLogin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.redirect("/login");
  next();
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .render("errors/403", { layout: false, user: req.user || null });
  }
  next();
};

const adminGuard = [requireLogin, requireAdmin];

// GET /admin/dashboard — UC25
adminViewsRouter.get(
  "/admin/dashboard",
  ...adminGuard,
  async (req: Request, res: Response) => {
    try {
      const stats = await adminService.getSystemDashboard();
      res.render("admin/dashboard", {
        layout: "layouts/admin",
        user: req.user,
        stats,
      });
    } catch (err) {
      res.status(500).send("Server error");
    }
  },
);

// Placeholder — UC23, UC24 implement sau
adminViewsRouter.get("/admin/events/pending", ...adminGuard, (req, res) => {
  res.render("errors/403", {
    layout: false,
    user: req.user,
    message: "UC23 — Coming soon",
  });
});

adminViewsRouter.get("/admin/users", ...adminGuard, (req, res) => {
  res.render("errors/403", {
    layout: false,
    user: req.user,
    message: "UC24 — Coming soon",
  });
});

export default adminViewsRouter;
