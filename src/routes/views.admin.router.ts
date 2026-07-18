import { Router, Request, Response, NextFunction } from "express";
import { adminService } from "../features/admin/admin.service";
import { RevenueReportQuerySchema } from "../features/admin/dto/revenue-report.dto";
import {
  AccountListQuerySchema,
  EventIdParamSchema,
  LockAccountSchema,
  PendingEventQuerySchema,
  RejectEventSchema,
  UserIdParamSchema,
} from "../features/admin/validators/admin.validator";
import {
  IAccountListQueryDto,
  IEventIdParamDto,
  ILockAccountDto,
  IPendingEventQueryDto,
  IRejectEventDto,
  IUserIdParamDto,
} from "../features/admin/dto/admin.dto";
import { AppError } from "../shared/errors/AppError";

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

// UC23 - Approve Event
adminViewsRouter.get(
  "/admin/events/pending",
  ...adminGuard,
  async (req: Request, res: Response) => {
    try {
      const validatedQuery: IPendingEventQueryDto =
        await PendingEventQuerySchema.validateAsync(req.query, {
          stripUnknown: true,
          abortEarly: false,
        });
      const pendingEventData = await adminService.getPendingEvents(validatedQuery);
      const messages = req.flash();

      res.render("admin/events/index", {
        layout: "layouts/admin",
        user: req.user,
        messages,
        ...pendingEventData,
      });
    } catch (err) {
      console.error("Không thể tải danh sách sự kiện chờ duyệt:", err);
      res
        .status(500)
        .send("Không thể tải danh sách sự kiện chờ duyệt lúc này.");
    }
  },
);

adminViewsRouter.post(
  "/admin/events/:eventId/approve",
  ...adminGuard,
  async (req: Request, res: Response) => {
    try {
      const validatedParams: IEventIdParamDto =
        await EventIdParamSchema.validateAsync(req.params, {
          stripUnknown: true,
          abortEarly: false,
        });
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError("Không xác định được tài khoản quản trị viên", 401);
      }

      const result = await adminService.approveEvent(
        validatedParams.eventId,
        adminId,
      );

      req.flash(
        result.emailSent ? "success" : "warning",
        result.emailSent
          ? "Duyệt sự kiện thành công."
          : "Sự kiện đã được duyệt nhưng email thông báo chưa gửi thành công.",
      );

      return res.redirect("/admin/events/pending");
    } catch (err) {
      console.error("Không thể duyệt sự kiện:", err);
      req.flash(
        "error",
        err instanceof Error
          ? err.message
          : "Không thể duyệt sự kiện lúc này.",
      );

      return res.redirect("/admin/events/pending");
    }
  },
);

adminViewsRouter.post(
  "/admin/events/:eventId/reject",
  ...adminGuard,
  async (req: Request, res: Response) => {
    try {
      const validatedParams: IEventIdParamDto =
        await EventIdParamSchema.validateAsync(req.params, {
          stripUnknown: true,
          abortEarly: false,
        });
      const validatedBody: IRejectEventDto =
        await RejectEventSchema.validateAsync(req.body, {
          stripUnknown: true,
          abortEarly: false,
        });
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError("Không xác định được tài khoản quản trị viên", 401);
      }

      const result = await adminService.rejectEvent(
        validatedParams.eventId,
        adminId,
        validatedBody.rejectionReason,
      );

      req.flash(
        result.emailSent ? "success" : "warning",
        result.emailSent
          ? "Từ chối sự kiện thành công. Sự kiện đã được chuyển về bản nháp."
          : "Sự kiện đã được chuyển về bản nháp nhưng email thông báo chưa gửi thành công.",
      );

      return res.redirect("/admin/events/pending");
    } catch (err) {
      console.error("Không thể từ chối sự kiện:", err);
      req.flash(
        "error",
        err instanceof Error
          ? err.message
          : "Không thể từ chối sự kiện lúc này.",
      );

      return res.redirect(`/admin/events/${req.params.eventId}`);
    }
  },
);

adminViewsRouter.get(
  "/admin/events/:eventId",
  ...adminGuard,
  async (req: Request, res: Response) => {
    try {
      const validatedParams: IEventIdParamDto =
        await EventIdParamSchema.validateAsync(req.params, {
          stripUnknown: true,
          abortEarly: false,
        });
      const detailData = await adminService.getEventReviewDetail(
        validatedParams.eventId,
      );
      const messages = req.flash();

      res.render("admin/events/detail", {
        layout: "layouts/admin",
        user: req.user,
        messages,
        ...detailData,
      });
    } catch (err) {
      console.error("Không thể tải chi tiết sự kiện:", err);
      req.flash("error", "Không thể tải thông tin sự kiện.");
      res.redirect("/admin/events/pending");
    }
  },
);

adminViewsRouter.get(
  "/admin/accounts",
  ...adminGuard,
  async (req: Request, res: Response) => {
    try {
      const validatedQuery: IAccountListQueryDto =
        await AccountListQuerySchema.validateAsync(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });
      const accountData = await adminService.getAccounts(validatedQuery);
      const messages = req.flash();

      res.render("admin/accounts/index", {
        layout: "layouts/admin",
        user: req.user,
        messages,
        ...accountData,
      });
    } catch (err) {
      console.error("Khong the tai danh sach tai khoan:", err);
      res.status(500).send("Khong the tai danh sach tai khoan luc nay.");
    }
  },
);

adminViewsRouter.get(
  "/admin/accounts/:userId",
  ...adminGuard,
  async (req: Request, res: Response) => {
    try {
      const validatedParams: IUserIdParamDto =
        await UserIdParamSchema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
      const accountData = await adminService.getAccountDetail(
        validatedParams.userId,
      );
      const messages = req.flash();

      res.render("admin/accounts/detail", {
        layout: "layouts/admin",
        user: req.user,
        messages,
        ...accountData,
      });
    } catch (err) {
      req.flash(
        "error",
        err instanceof Error
          ? err.message
          : "Khong the tai thong tin tai khoan.",
      );

      return res.redirect("/admin/accounts");
    }
  },
);

adminViewsRouter.post(
  "/admin/accounts/:userId/lock",
  ...adminGuard,
  async (req: Request, res: Response) => {
    try {
      const validatedParams: IUserIdParamDto =
        await UserIdParamSchema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
      const validatedBody: ILockAccountDto =
        await LockAccountSchema.validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError("Khong xac dinh duoc tai khoan quan tri vien", 401);
      }

      const result = await adminService.lockAccount(
        validatedParams.userId,
        adminId,
        validatedBody.reason,
      );

      req.flash(
        result.emailSent ? "success" : "warning",
        result.emailSent
          ? "Khoa tai khoan thanh cong."
          : "Tai khoan da bi khoa nhung email thong bao chua gui duoc.",
      );

      return res.redirect(`/admin/accounts/${validatedParams.userId}`);
    } catch (err) {
      req.flash(
        "error",
        err instanceof Error
          ? err.message
          : "Khong the khoa tai khoan luc nay.",
      );

      return res.redirect(`/admin/accounts/${req.params.userId}`);
    }
  },
);

adminViewsRouter.post(
  "/admin/accounts/:userId/unlock",
  ...adminGuard,
  async (req: Request, res: Response) => {
    try {
      const validatedParams: IUserIdParamDto =
        await UserIdParamSchema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError("Khong xac dinh duoc tai khoan quan tri vien", 401);
      }

      const result = await adminService.unlockAccount(
        validatedParams.userId,
        adminId,
      );

      req.flash(
        result.emailSent ? "success" : "warning",
        result.emailSent
          ? "Mo khoa tai khoan thanh cong."
          : "Tai khoan da duoc mo khoa nhung email thong bao chua gui duoc.",
      );

      return res.redirect(`/admin/accounts/${validatedParams.userId}`);
    } catch (err) {
      req.flash(
        "error",
        err instanceof Error
          ? err.message
          : "Khong the mo khoa tai khoan luc nay.",
      );

      return res.redirect(`/admin/accounts/${req.params.userId}`);
    }
  },
);

adminViewsRouter.get("/admin/users", ...adminGuard, (req, res) => {
  res.redirect("/admin/accounts");
});

export default adminViewsRouter;
