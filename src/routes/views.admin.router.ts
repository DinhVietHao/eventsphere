import { Router, Request, Response, NextFunction } from "express";
import { adminService } from "../features/admin/admin.service";
import {RevenueReportQuerySchema} from "../features/admin/dto/revenue-report.dto";

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

// --- UC26: VIEW REVENUE REPORT (GIAO DIỆN BÁO CÁO DOANH THU) ---
adminViewsRouter.get(
    "/admin/revenue",
    ...adminGuard,
    async (req: Request, res: Response) => {
      try {
        // 1. Lọc và ép kiểu các tham số truyền trên URL (giống hệt bên API Controller)
        const validatedQuery = await RevenueReportQuerySchema.validateAsync(
            req.query,
            { stripUnknown: true, abortEarly: false }
        );

        // 2. Lấy dữ liệu thống kê từ Service
        const reportData = await adminService.getRevenueReport(validatedQuery);
        const organizers = await adminService.getOrganizersList();

        // 3. Render ra file revenue.ejs
        res.render("admin/revenue", {
          layout: "layouts/admin", // Bọc giao diện trong layout chung của Admin
          user: req.user,          // Truyền thông tin user để Navbar hiển thị avatar
          organizers,
          ...reportData            // Cú pháp Spread (...) giúp rải trực tiếp các biến chartData, filters... ra ngoài cho EJS dễ xài
        });
      } catch (err) {
        // Nếu Joi báo lỗi validate URL, có thể đẩy về trang dashboard kèm thông báo, hoặc hiện lỗi 500
        res.status(500).send("Không thể tải báo cáo doanh thu lúc này.");
      }
    }
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
