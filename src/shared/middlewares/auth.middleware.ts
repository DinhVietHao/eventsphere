import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { AppError } from '../errors/AppError';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Bạn chưa đăng nhập', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    (req as any).user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    next(new AppError('Token không hợp lệ hoặc đã hết hạn', 401));
  }
};