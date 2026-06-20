import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError";
import { IUserPayload } from "../types/express.d";
import { appConfig } from "../../config/app.config";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  // Kiểm tra header có dạng "Bearer <token>"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Bạn chưa đăng nhập", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(
      token,
      appConfig.jwt.accessSecret,
    ) as IUserPayload;
    req.user = payload;
    next();
  } catch {
    return next(new AppError("Token không hợp lệ hoặc đã hết hạn", 401));
  }
};
