import bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { TokenRepository } from './repositories/token.repository';
import { AppError } from '../../shared/errors/AppError';
import { IAuthResponse } from './types/auth.types';

export class AuthService {
  private userRepository: UserRepository;
  private tokenRepository: TokenRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.tokenRepository = new TokenRepository();
  }

  async register(dto: any): Promise<IAuthResponse> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new AppError('Email này đã được sử dụng trên hệ thống', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const newUser = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });

    return {
      user: { id: (newUser as any)._id, name: newUser.name, email: newUser.email, role: newUser.role },
      accessToken: 'mock_access_token_via_real_repo',
      refreshToken: 'mock_refresh_token_via_real_repo',
    };
  }

  async login(dto: any, clientIp?: string, userAgent?: string): Promise<IAuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    if (!user.isActive) {
      throw new AppError('Tài khoản của bạn đã bị khóa bởi quản trị viên', 403);
    }

    const isPasswordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordMatch) {
      throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    }

    // Giả lập lưu Refresh Token vào DB thật để test cơ chế liên kết dữ liệu
    const mockTokenHash = 'hashed_refresh_token_' + Date.now();
    await this.tokenRepository.createToken({
      userId: (user as any)._id,
      tokenHash: mockTokenHash,
      ipAddress: clientIp || '127.0.0.1',
      deviceName: userAgent || 'Unknown Device',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Hết hạn sau 7 ngày
    });

    return {
      user: { id: (user as any)._id, name: user.name, email: user.email, role: user.role },
      accessToken: 'access_token_approved',
      refreshToken: mockTokenHash,
    };
  }
}