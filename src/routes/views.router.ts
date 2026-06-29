import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { AuthService } from "../features/auth/auth.service";
import { verifyAccessToken } from "../shared/utils/jwt.util";
import { EventService } from "../features/events/events.service";

const viewsRouter = Router();
const authService = new AuthService();
const eventService = new EventService();

// Middleware đọc user từ cookie — optional, không block request
viewsRouter.use((req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken;
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.id, role: payload.role, name: payload.name };
    }
  } catch (_) {
    // Token hết hạn hoặc invalid → bỏ qua, user = null
  }
  next();
});

const LIMIT = 9;

// UC01 + UC04 — Danh sách + lọc
viewsRouter.get("/events", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const category = req.query.category as string | undefined;
    const startFrom = req.query.startFrom as string | undefined;
    const startTo = req.query.startTo as string | undefined;
    const hasFilter = category || startFrom || startTo;

    const [events, total] = await Promise.all([
      hasFilter
        ? eventService.filterEvents({
            category,
            startFrom: startFrom ? new Date(startFrom) : undefined,
            startTo: startTo ? new Date(startTo) : undefined,
          })
        : eventService.getPublishedEvents(page, LIMIT),
      eventService.countPublishedEvents({ category }),
    ]);

    res.render("events/index", {
      events,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / LIMIT),
        limit: LIMIT,
      },
      user: req.user || null,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// UC03 — Tìm kiếm
viewsRouter.get("/events/search", async (req: Request, res: Response) => {
  try {
    const keyword = req.query.keyword as string;
    const events = keyword ? await eventService.searchEvents(keyword) : [];
    res.render("events/search", { events, keyword, user: req.user || null });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// UC02 — Chi tiết event
viewsRouter.get("/events/:id", async (req: Request, res: Response) => {
  try {
    const event = await eventService.getEventById(req.params.id as string);
    res.render("events/detail", { event, user: req.user || null });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// ───── AUTH ROUTES ─────

// Hiển thị form đăng nhập
viewsRouter.get("/login", (req: Request, res: Response) => {
  const messages = req.flash();
  res.render("auth/login", {
    layout: false,
    error: null,
    success: messages.success?.[0] || null,
  });
});

// Xử lý đăng nhập
viewsRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.cookie("accessToken", result.accessToken, { httpOnly: true });
    res.cookie("refreshToken", result.refreshToken, { httpOnly: true });
    res.redirect("/events");
  } catch (err: any) {
    res.render("auth/login", {
      layout: false,
      error: err.message || "Đăng nhập thất bại",
      success: null,
    });
  }
});

// Hiển thị form đăng ký
viewsRouter.get("/register", (req: Request, res: Response) => {
  const messages = req.flash();
  res.render("auth/register", {
    layout: false,
    error: null,
    old: null,
  });
});

// Xử lý đăng ký
viewsRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    await authService.register({ name, email, password, role });

    (req as any).flash("success", "Đăng ký thành công! Vui lòng đăng nhập.");
    res.redirect("/login");
  } catch (err: any) {
    res.render("auth/register", {
      layout: false,
      error: err.message || "Đăng ký thất bại",
      old: { name: req.body.name, email: req.body.email, role: req.body.role },
    });
  }
});

// Logout
viewsRouter.get("/logout", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await authService.logout(token);
  } catch (_) {
    // Kể cả logout lỗi vẫn xóa cookie
  } finally {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.redirect("/login");
  }
});

export default viewsRouter;
