import { AuthService } from "./auth.service";
import { Request, Response, NextFunction } from "express";
import {
  RegisterSchema,
  LoginSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
} from "./dto/auth.dto";
import { sendSuccess } from "../../shared/utils/response.util";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  public register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Kiểm tra dữ liệu đầu vào
      const { error, value } = RegisterSchema.validate(req.body);
      if (error) {
        res
          .status(400)
          .json({ success: false, message: error.details[0].message });
        return;
      }

      const result = await this.authService.register(value);
      sendSuccess(res, result, "Đăng ký tài khoản thành công", 201);
    } catch (err) {
      next(err);
    }
  };

  public login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Kiểm tra dữ liệu đăng nhập
      const { error, value } = LoginSchema.validate(req.body);
      if (error) {
        res
          .status(400)
          .json({ success: false, message: error.details[0].message });
        return;
      }

      // Lấy thông tin thiết bị và IP từ request để lưu nhật ký phiên
      const clientIp = req.ip;
      const userAgent = req.headers["user-agent"];

      const result = await this.authService.login(value, clientIp, userAgent);
      sendSuccess(res, result, "Đăng nhập thành công", 200);
    } catch (err) {
      next(err);
    }
  };

  public logout = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res
          .status(400)
          .json({ success: false, message: "refreshToken là bắt buộc" });
        return;
      }

      await this.authService.logout(refreshToken);
      sendSuccess(res, null, "Đăng xuất thành công");
    } catch (err) {
      next(err);
    }
  };

  // Lấy thông tin profile của user đang đăng nhập
  public getMe = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const profile = await this.authService.getProfile(userId);
      sendSuccess(res, profile, "Lấy thông tin thành công");
    } catch (err) {
      next(err);
    }
  };

  // Cập nhật thông tin profile
  public updateMe = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { error, value } = UpdateProfileSchema.validate(req.body);
      if (error) {
        res
          .status(400)
          .json({ success: false, message: error.details[0].message });
        return;
      }

      const userId = (req as any).user.id;
      const updated = await this.authService.updateProfile(userId, value);
      sendSuccess(res, updated, "Cập nhật thông tin thành công");
    } catch (err) {
      next(err);
    }
  };

  // Đổi mật khẩu
  public changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { error, value } = ChangePasswordSchema.validate(req.body);
      if (error) {
        res
          .status(400)
          .json({ success: false, message: error.details[0].message });
        return;
      }

      const userId = (req as any).user.id;
      await this.authService.changePassword(userId, value);
      sendSuccess(res, null, "Đổi mật khẩu thành công");
    } catch (err) {
      next(err);
    }
  };
}
