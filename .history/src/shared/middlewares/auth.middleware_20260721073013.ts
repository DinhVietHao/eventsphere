import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.util";
import { AppError } from "../errors/AppError";
import { UserRepository } from "../../features/auth/repositories/user.repository";

const userRepository = new UserRepository();

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AppError("Ban chua dang nhap", 401);
    }

    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.id);

    if (!user) {
      throw new AppError("Tài khoản đã tồn tại", 401);
    }

    if (!user.isActive) {
      throw new AppError(
        "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        403,
      );
    }

    req.user = { id: user._id.toString(), role: user.role, name: user.name };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }

    next(new AppError("Token không hợp lệ hoặc đã hết han", 401));
  }
};
