import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      throw new AppError("Bạn chưa đăng nhập", 401);
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AppError("Bạn không có quyền thực hiện hành động này", 403);
    }

    next();
  };
};
