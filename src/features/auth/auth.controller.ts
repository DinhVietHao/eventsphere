import { AuthService } from './auth.service';
import { Request, Response, NextFunction } from 'express';
import { RegisterSchema, LoginSchema } from './dto/auth.dto';
import { sendSuccess } from '../../shared/utils/response.util';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Kiểm tra dữ liệu đầu vào
      const { error, value } = RegisterSchema.validate(req.body);
      if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
      }

      const result = await this.authService.register(value);
      sendSuccess(res, result, 'Đăng ký tài khoản thành công', 201);
    } catch (err) {
      next(err);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Kiểm tra dữ liệu đăng nhập
      const { error, value } = LoginSchema.validate(req.body);
      if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
      }

      // Lấy thông tin thiết bị và IP từ request để lưu nhật ký phiên
      const clientIp = req.ip;
      const userAgent = req.headers['user-agent'];
      
      const result = await this.authService.login(value, clientIp, userAgent);
      sendSuccess(res, result, 'Đăng nhập thành công', 200);
    } catch (err) {
      next(err);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'refreshToken là bắt buộc' });
        return;
      }

      await this.authService.logout(refreshToken);
      sendSuccess(res, null, 'Đăng xuất thành công');
    } catch (err) {
      next(err);
    }
  };

}