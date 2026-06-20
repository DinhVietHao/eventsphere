import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export const roleMiddleware = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Bạn chưa đăng nhập", 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("Bạn không có quyền thực hiện hành động này", 403),
      );
    }
    next();
  };
};
