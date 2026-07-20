import bcrypt from "bcrypt";
import crypto from "crypto";
import { IAuthResponse } from "./types/auth.types";
import { AppError } from "../../shared/errors/AppError";
import { UserRepository } from "./repositories/user.repository";
import { TokenRepository } from "./repositories/token.repository";
import { emailService } from "../../shared/services/email.service";
import { signAccessToken, signRefreshToken } from "../../shared/utils/jwt.util";

// Thời hạn hiệu lực của link xác thực email và link đặt lại mật khẩu
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;  // 24 giờ
const PASSWORD_RESET_TTL_MS     = 30 * 60 * 1000;       // 30 phút

export class AuthService {
  private userRepository = new UserRepository();
  private tokenRepository = new TokenRepository();

  async register(
    dto: any,
    baseUrl: string,
  ): Promise<{ user: { id: string; name: string; email: string; role: string } }> {
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

    // Sinh token xác thực email — chỉ lưu bản hash trong DB, gửi token gốc qua mail (giống cơ chế refresh token)
    const rawVerifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenHash = crypto.createHash("sha256").update(rawVerifyToken).digest("hex");
    await this.userRepository.setEmailVerificationToken(
      userId,
      verifyTokenHash,
      new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    );

    const verifyUrl = `${baseUrl}/verify-email?token=${rawVerifyToken}`;
    await emailService.sendVerificationEmail({
      to: newUser.email,
      name: newUser.name,
      verifyUrl,
    });

    // Không trả token đăng nhập ở đây — user phải xác thực email rồi tự đăng nhập lại
    return {
      user: {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    };
  }

  async login(
    dto: any,
    clientIp?: string,
    userAgent?: string,
  ): Promise<IAuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new AppError("Email hoặc mật khẩu không chính xác", 401);

    const isPasswordMatch = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordMatch)
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);

    if (!user.emailVerified)
      throw new AppError(
        "Tài khoản chưa xác thực email. Vui lòng kiểm tra hộp thư để xác thực trước khi đăng nhập.",
        403,
      );

    if (!user.isActive)
      throw new AppError("Tai khoan cua ban da bi khoa. Vui long lien he quan tri vien.", 403);

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

  // Xác thực email từ link trong mail đăng ký
  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const user = await this.userRepository.findByEmailVerificationToken(tokenHash);

    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      throw new AppError("Link xác thực không hợp lệ hoặc đã hết hạn", 400);
    }

    await this.userRepository.markEmailVerified((user as any)._id.toString());
  }

  // Gửi email đặt lại mật khẩu. Không throw khi email không tồn tại — tránh lộ thông tin (user enumeration)
  async forgotPassword(email: string, baseUrl: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return;

    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");
    await this.userRepository.setPasswordResetToken(
      (user as any)._id.toString(),
      resetTokenHash,
      new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    );

    const resetUrl = `${baseUrl}/reset-password/${rawResetToken}`;
    await emailService.sendResetPasswordEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
  }

  // Đặt mật khẩu mới bằng token từ email quên mật khẩu
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const user = await this.userRepository.findByPasswordResetToken(tokenHash);

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new AppError("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn", 400);
    }

    const userId = (user as any)._id.toString();
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.resetPassword(userId, newPasswordHash);

    // Thu hồi toàn bộ phiên đăng nhập cũ để bắt buộc đăng nhập lại bằng mật khẩu mới
    await this.tokenRepository.revokeAllByUserId(userId);
  }

  // Lấy thông tin profile của user đang đăng nhập
  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

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
    const user = await this.userRepository.findByIdWithPassword(userId);
    if (!user) throw new AppError("Người dùng không tồn tại", 404);

    const isMatch = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) throw new AppError("Mật khẩu hiện tại không đúng", 400);

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