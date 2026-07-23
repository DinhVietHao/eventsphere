import { AuthService } from "./auth.service";
import { Request, Response, NextFunction } from "express";
import {
  RegisterSchema,
  LoginSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
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
      const { error, value } = RegisterSchema.validate(req.body);
      if (error) {
        res
          .status(400)
          .json({ success: false, message: error.details[0].message });
        return;
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const result = await this.authService.register(value, baseUrl);
      sendSuccess(
        res,
        result,
        "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
        201,
      );
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
      const { error, value } = LoginSchema.validate(req.body);
      if (error) {
        res
          .status(400)
          .json({ success: false, message: error.details[0].message });
        return;
      }

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

  public verifyEmail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const token = req.query.token as string;
      if (!token) {
        res.status(400).json({ success: false, message: "token là bắt buộc" });
        return;
      }
      await this.authService.verifyEmail(token);
      sendSuccess(res, null, "Xác thực email thành công");
    } catch (err) {
      next(err);
    }
  };

  public forgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { error, value } = ForgotPasswordSchema.validate(req.body);
      if (error) {
        res
          .status(400)
          .json({ success: false, message: error.details[0].message });
        return;
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      await this.authService.forgotPassword(value.email, baseUrl);
      // Luôn trả về thành công — không tiết lộ email có tồn tại trong hệ thống hay không
      sendSuccess(
        res,
        null,
        "Nếu email tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi",
      );
    } catch (err) {
      next(err);
    }
  };

  public resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { error, value } = ResetPasswordSchema.validate(req.body);
      if (error) {
        res
          .status(400)
          .json({ success: false, message: error.details[0].message });
        return;
      }

      const { token } = req.body;
      if (!token) {
        res.status(400).json({ success: false, message: "token là bắt buộc" });
        return;
      }

      await this.authService.resetPassword(token, value.password);
      sendSuccess(res, null, "Đặt lại mật khẩu thành công");
    } catch (err) {
      next(err);
    }
  };

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