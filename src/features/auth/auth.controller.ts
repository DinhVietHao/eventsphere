import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { RegisterSchema, LoginSchema } from './dto/auth.dto';
import { sendSuccess } from '../../shared/utils/response.util';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Sử dụng arrow function để không bị mất ngữ cảnh 'this' khi Express Router gọi
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Kiểm tra dữ liệu đầu vào thông qua DTO Joi Schema
      const { error, value } = RegisterSchema.validate(req.body);
      if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
      }

      // 2. Gọi tầng Service xử lý nghiệp vụ
      const result = await this.authService.register(value);

      // 3. Trả về phản hồi JSON chuẩn thành công (Status 201 Created)
      sendSuccess(res, result, 'Đăng ký tài khoản thành công', 201);
    } catch (err) {
      next(err); // Đẩy lỗi sang Global Error Handler (app.ts)
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Kiểm tra dữ liệu đăng nhập
      const { error, value } = LoginSchema.validate(req.body);
      if (error) {
        res.status(400).json({ success: false, message: error.details[0].message });
        return;
      }

      // Lấy thông tin thiết bị và IP từ request để lưu nhật ký phiên (Token log)
      const clientIp = req.ip;
      const userAgent = req.headers['user-agent'];

      // 2. Gọi tầng Service xử lý xác thực
      const result = await this.authService.login(value, clientIp, userAgent);

      // 3. Trả về phản hồi thành công (Status 200 OK)
      sendSuccess(res, result, 'Đăng nhập thành công', 200);
    } catch (err) {
      next(err);
    }
  };
}