import { Router } from "express";
import { Request, Response } from "express";
import { AuthService } from "../features/auth/auth.service";
import { verifyAccessToken } from "../shared/utils/jwt.util";

const authViewsRouter = Router();
const authService = new AuthService();

// "Ghi nhớ tôi" -> cookie tồn tại 7 ngày, bằng thời hạn refresh token
const REMEMBER_ME_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Middleware bảo vệ route — redirect về /login nếu chưa đăng nhập
function requireAuth(req: Request, res: Response, next: Function) {
  const token = (req as any).cookies?.accessToken;
  if (!token) return res.redirect("/login");
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = {
      id: payload.id,
      role: payload.role,
      name: payload.name,
    };
    next();
  } catch {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.redirect("/login");
  }
}

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
    const { email, password, remember } = req.body;
    const result = await authService.login({ email, password });

    const isRemember = remember === "on";
    const cookieOptions = isRemember
      ? { httpOnly: true, maxAge: REMEMBER_ME_MAX_AGE_MS }
      : { httpOnly: true };

    res.cookie("accessToken", result.accessToken, cookieOptions);
    res.cookie("refreshToken", result.refreshToken, cookieOptions);
    res.redirect("/events");
  } catch (err: any) {
    res.render("auth/login", {
      layout: false,
      error: err.message || "Đăng nhập thất bại",
      success: null,
    });
  }
});

// Hiển thị form đăng ký — role lấy từ query string do navbar gửi sang (?role=attendee|organizer)
authViewsRouter.get("/register", (req: Request, res: Response) => {
  const role = req.query.role === "organizer" ? "organizer" : "attendee";
  res.render("auth/register", {
    layout: false,
    error: null,
    old: { role },
  });
});

// Xử lý đăng ký
authViewsRouter.post("/register", async (req: Request, res: Response) => {
  const role = req.body.role === "organizer" ? "organizer" : "attendee";
  try {
    const { name, email, password } = req.body;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    await authService.register({ name, email, password, role }, baseUrl);

    (req as any).flash(
      "success",
      "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.",
    );
    res.redirect("/login");
  } catch (err: any) {
    res.render("auth/register", {
      layout: false,
      error: err.message || "Đăng ký thất bại",
      old: { name: req.body.name, email: req.body.email, role },
    });
  }
});

// Xác thực email qua link gửi trong mail đăng ký
authViewsRouter.get("/verify-email", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) throw new Error("Link xác thực không hợp lệ");

    await authService.verifyEmail(token);
    (req as any).flash(
      "success",
      "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.",
    );
  } catch (err: any) {
    (req as any).flash(
      "error",
      err.message || "Link xác thực không hợp lệ hoặc đã hết hạn",
    );
  }
  res.redirect("/login");
});

// Hiển thị form quên mật khẩu
authViewsRouter.get("/forgot-password", (req: Request, res: Response) => {
  const messages = req.flash();
  res.render("auth/forgot-password", {
    layout: false,
    error: null,
    success: messages.success?.[0] || null,
  });
});

// Gửi email đặt lại mật khẩu — luôn phản hồi cùng 1 thông báo để tránh lộ email có tồn tại hay không
authViewsRouter.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    await authService.forgotPassword(email, baseUrl);

    (req as any).flash(
      "success",
      "Nếu email tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.",
    );
    res.redirect("/forgot-password");
  } catch (err: any) {
    res.render("auth/forgot-password", {
      layout: false,
      error: err.message || "Có lỗi xảy ra, vui lòng thử lại",
      success: null,
    });
  }
});

// Hiển thị form đặt lại mật khẩu
authViewsRouter.get("/reset-password/:token", (req: Request, res: Response) => {
  res.render("auth/reset-password", {
    layout: false,
    token: req.params.token,
    error: null,
  });
});

// Xử lý đặt lại mật khẩu
authViewsRouter.post("/reset-password/:token", async (req: Request, res: Response) => {
  try {
    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      throw new Error("Mật khẩu xác nhận không khớp");
    }

    await authService.resetPassword(req.params.token as string, password);
    (req as any).flash(
      "success",
      "Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.",
    );
    res.redirect("/login");
  } catch (err: any) {
    res.render("auth/reset-password", {
      layout: false,
      token: req.params.token,
      error: err.message || "Đặt lại mật khẩu thất bại",
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

// ─── Profile ───

// Hiển thị trang profile
authViewsRouter.get(
  "/profile",
  requireAuth,
  async (req: Request, res: Response) => {
    const activeTab = (req.query.tab as string) || "info";
    const messages = (req as any).flash?.() ?? {};
    try {
      const profile = await authService.getProfile((req as any).user.id);
      res.render("auth/profile", {
        layout: false,
        user: (req as any).user,
        profile,
        activeTab,
        error: messages.error?.[0] ?? null,
        success: messages.success?.[0] ?? null,
      });
    } catch (err: any) {
      res.redirect("/login");
    }
  },
);

// Cập nhật thông tin cá nhân
authViewsRouter.post(
  "/profile",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { name, phone, avatar } = req.body;
      await authService.updateProfile((req as any).user.id, {
        name: name || undefined,
        phone: phone || undefined,
        avatar: avatar || undefined,
      });
      (req as any).flash?.("success", "Cập nhật thông tin thành công!");
      res.redirect("/profile?tab=info");
    } catch (err: any) {
      const profile = await authService.getProfile((req as any).user.id);
      res.render("auth/profile", {
        layout: false,
        user: (req as any).user,
        profile,
        activeTab: "info",
        error: err.message || "Cập nhật thất bại",
        success: null,
      });
    }
  },
);

// Đổi mật khẩu
authViewsRouter.post(
  "/profile/change-password",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (newPassword !== confirmPassword) {
        throw new Error("Mật khẩu xác nhận không khớp");
      }
      await authService.changePassword((req as any).user.id, {
        currentPassword,
        newPassword,
      });
      (req as any).flash?.("success", "Đổi mật khẩu thành công!");
      res.redirect("/profile?tab=password");
    } catch (err: any) {
      const profile = await authService.getProfile((req as any).user.id);
      res.render("auth/profile", {
        layout: false,
        user: (req as any).user,
        profile,
        activeTab: "password",
        error: err.message || "Đổi mật khẩu thất bại",
        success: null,
      });
    }
  },
);

export default authViewsRouter;