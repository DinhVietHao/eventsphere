// src/shared/middlewares/role.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export const roleMiddleware = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("Bạn không có quyền thực hiện hành động này", 403);
    }
    next();
  };
};
