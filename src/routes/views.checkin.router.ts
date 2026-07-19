import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { EventService } from "../features/events/events.service";
import { verifyAccessToken } from "../shared/utils/jwt.util";
import { User } from "../features/auth/models/user.model";

const checkinViewsRouter = Router();
const eventService = new EventService();

// Guard riêng cho view — redirect thay vì trả JSON 401
const requireLogin = (req: Request, res: Response, next: NextFunction) => {
  const token = (req as any).cookies?.accessToken;
  if (!token) return res.redirect("/login");
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.redirect("/login");
  }
};

const requireStaff = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !["staff", "admin"].includes(req.user.role)) {
    return res
      .status(403)
      .render("errors/403", { layout: false, user: req.user || null });
  }
  next();
};

// GET /staff/checkin — UC21 & UC22
checkinViewsRouter.get(
  "/staff/checkin",
  requireLogin,
  requireStaff,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;

      const assignedEvents =
        role === "admin"
          ? await eventService.getPublishedEvents(1, 100)
          : await eventService.getEventsByStaffId(userId);

      const fullUserProfile = await User.findById(userId).lean();

      res.render("staff/checkin", {
        events: assignedEvents,
        user: fullUserProfile || req.user,
        messages: (req as any).flash?.() || {},
      });
    } catch (error) {
      console.error("Lỗi khi tải giao diện soát vé:", error);
      res.status(500).send("Lỗi máy chủ khi tải trang soát vé");
    }
  },
);

export default checkinViewsRouter;
