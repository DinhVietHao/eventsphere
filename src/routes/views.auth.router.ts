import { Router } from "express";
import { Request, Response } from "express";
import { AuthService } from "../features/auth/auth.service";

const authViewsRouter = Router();
const authService = new AuthService();

// Hiển thị form đăng nhập
authViewsRouter.get("/login", (req: Request, res: Response) => {
  const messages = req.flash();
  res.render("auth/login", {
    layout: false,
    error: null,
    success: messages.success?.[0] || null,
  });
});

// Xử lý đăng nhập
authViewsRouter.post("/login", async (req: Request, res: Response) => {
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
authViewsRouter.get("/register", (req: Request, res: Response) => {
  res.render("auth/register", {
    layout: false,
    error: null,
    old: null,
  });
});

// Xử lý đăng ký
authViewsRouter.post("/register", async (req: Request, res: Response) => {
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
authViewsRouter.get("/logout", async (req: Request, res: Response) => {
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

export default authViewsRouter;
