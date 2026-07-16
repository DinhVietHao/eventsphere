import bcrypt from "bcrypt";
import crypto from "crypto";
import { IAuthResponse } from "./types/auth.types";
import { AppError } from "../../shared/errors/AppError";
import { UserRepository } from "./repositories/user.repository";
import { TokenRepository } from "./repositories/token.repository";
import { signAccessToken, signRefreshToken } from "../../shared/utils/jwt.util";

export class AuthService {
  private userRepository = new UserRepository();
  private tokenRepository = new TokenRepository();

  async register(dto: any): Promise<IAuthResponse> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new AppError("Email này đã được sử dụng trên hệ thống", 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const newUser = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });

    const userId = (newUser as any)._id.toString();

    const accessToken = signAccessToken({
      id: userId,
      role: newUser.role,
      name: newUser.name,
    });
    const refreshToken = signRefreshToken({
      id: userId,
      role: newUser.role,
      name: newUser.name,
    });

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    await this.tokenRepository.createToken({
      userId: (newUser as any)._id,
      tokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user: {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(
    dto: any,
    clientIp?: string,
    userAgent?: string,
  ): Promise<IAuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new AppError("Email hoặc mật khẩu không chính xác", 401);

    if (!user.isActive)
      throw new AppError("Tài khoản của bạn đã bị khóa bởi quản trị viên", 403);

    const isPasswordMatch = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordMatch)
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);

    const userId = (user as any)._id.toString();

    const accessToken = signAccessToken({
      id: userId,
      role: user.role,
      name: user.name,
    });
    const refreshToken = signRefreshToken({
      id: userId,
      role: user.role,
      name: user.name,
    });

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    await this.tokenRepository.createToken({
      userId: (user as any)._id,
      tokenHash: tokenHash,
      ipAddress: clientIp,
      deviceName: userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user: { id: userId, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const existingToken = await this.tokenRepository.findByHash(tokenHash);
    if (!existingToken) {
      throw new AppError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn", 401);
    }
    await this.tokenRepository.deleteByHash(tokenHash);
  }

  // Lấy thông tin profile của user đang đăng nhập
  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

    // Trả về chỉ những field cần thiết, loại bỏ các field nhạy cảm
    return {
      id: (user as any)._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone ?? null,
      avatar: user.avatar ?? null,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Cập nhật thông tin profile (name, phone, avatar)
  async updateProfile(
    userId: string,
    dto: { name?: string; phone?: string; avatar?: string },
  ) {
    const user = await this.userRepository.updateProfile(userId, dto);
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

    return {
      id: (user as any)._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone ?? null,
      avatar: user.avatar ?? null,
    };
  }

  // Đổi mật khẩu — kiểm tra mật khẩu cũ trước khi cho phép thay đổi
  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    // Lấy user kèm passwordHash (field bị ẩn mặc định)
    const user = await this.userRepository.findByIdWithPassword(userId);
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) throw new AppError("Mật khẩu hiện tại không đúng", 400);

    // Không cho phép đặt lại mật khẩu giống mật khẩu cũ
    const isSamePassword = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );
    if (isSamePassword)
      throw new AppError(
        "Mật khẩu mới không được trùng mật khẩu hiện tại",
        400,
      );

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.updatePassword(userId, newPasswordHash);
  }
}
