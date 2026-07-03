import jwt from "jsonwebtoken";
import { appConfig } from "../../config/app.config";

export interface IJwtPayload {
  id: string;
  role: "attendee" | "organizer" | "staff" | "admin";
  name: string;
}

// Tạo access token — hết hạn nhanh (15 phút)
export const signAccessToken = (payload: IJwtPayload): string => {
  return jwt.sign(payload, appConfig.jwtAccessSecret, {
    expiresIn: appConfig.jwtAccessExpires as any,
  });
};

// Tạo refresh token — hết hạn lâu (7 ngày)
export const signRefreshToken = (payload: IJwtPayload): string => {
  return jwt.sign(payload, appConfig.jwtRefreshSecret, {
    expiresIn: appConfig.jwtRefreshExpires as any,
  });
};

// Verify access token — trả về payload nếu hợp lệ
export const verifyAccessToken = (token: string): IJwtPayload => {
  return jwt.verify(token, appConfig.jwtAccessSecret) as IJwtPayload;
};
