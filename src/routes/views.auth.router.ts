import { Router } from "express";
import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { AuthService } from "../features/auth/auth.service";
import { verifyAccessToken } from "../shared/utils/jwt.util";
import { uploadAvatar } from "../shared/middlewares/upload.middleware";

const authViewsRouter = Router();
const authService = new AuthService();

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

// ─── Profile ───────────────────────────────────────────────────────────────

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

// Upload avatar
authViewsRouter.post(
  "/profile/avatar",
  requireAuth,
  (req: Request, res: Response) => {
    uploadAvatar(req, res, async (err) => {
      const userId = (req as any).user.id;

      if (err) {
        const profile = await authService.getProfile(userId);
        return res.render("auth/profile", {
          layout: false,
          user: (req as any).user,
          profile,
          activeTab: "info",
          error: err.message || "Upload ảnh thất bại",
          success: null,
        });
      }

      if (!req.file) {
        (req as any).flash?.("error", "Vui lòng chọn file ảnh");
        return res.redirect("/profile?tab=info");
      }

      try {
        // Lấy avatar cũ để xóa file nếu có
        const currentProfile = await authService.getProfile(userId);
        const oldAvatar = currentProfile.avatar;

        // Đường dẫn public để lưu vào DB và hiển thị
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        await authService.updateProfile(userId, { avatar: avatarUrl });

        // Xóa file avatar cũ nếu là file local (không xóa nếu là URL ngoài)
        if (oldAvatar && oldAvatar.startsWith("/uploads/")) {
          const oldPath = path.join(process.cwd(), "public", oldAvatar);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        (req as any).flash?.("success", "Cập nhật ảnh đại diện thành công!");
        res.redirect("/profile?tab=info");
      } catch (updateErr: any) {
        // Xóa file vừa upload nếu update DB lỗi
        if (req.file) fs.unlinkSync(req.file.path);
        const profile = await authService.getProfile(userId);
        res.render("auth/profile", {
          layout: false,
          user: (req as any).user,
          profile,
          activeTab: "info",
          error: updateErr.message || "Cập nhật ảnh thất bại",
          success: null,
        });
      }
    });
  },
);

export default authViewsRouter;
