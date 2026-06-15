// src/shared/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError";
import { IUserPayload } from "../types/express.d";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) throw new AppError("Bạn chưa đăng nhập", 401);

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET!,
    ) as IUserPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError("Token không hợp lệ hoặc đã hết hạn", 401);
  }
};
