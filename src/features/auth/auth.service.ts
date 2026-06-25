import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { IAuthResponse } from './types/auth.types';
import { AppError } from '../../shared/errors/AppError';
import { UserRepository } from './repositories/user.repository';
import { TokenRepository } from './repositories/token.repository';
import { signAccessToken, signRefreshToken } from '../../shared/utils/jwt.util';

export class AuthService {
  private userRepository : UserRepository;
  private tokenRepository: TokenRepository;

  constructor() {
    this.userRepository  = new UserRepository();
    this.tokenRepository = new TokenRepository();
  }

  async register(dto: any): Promise<IAuthResponse> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new AppError('Email này đã được sử dụng trên hệ thống', 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser = await this.userRepository.create({
      name : dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });

    const userId = (newUser as any)._id.toString();

    // Tạo JWT
    const accessToken  = signAccessToken({ id: userId, role: newUser.role });
    const refreshToken = signRefreshToken({ id: userId, role: newUser.role });

    // Hash refresh token trước khi lưu DB — không lưu raw token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.tokenRepository.createToken({
      userId   : (newUser as any)._id,
      tokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user: { id: userId, name: newUser.name, email: newUser.email, role: newUser.role },
      accessToken,
      refreshToken,
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

    const userId = (user as any)._id.toString();

    // Tạo JWT
    const accessToken  = signAccessToken({ id: userId, role: user.role });
    const refreshToken = signRefreshToken({ id: userId, role: user.role });

    // Hash refresh token trước khi lưu DB
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.tokenRepository.createToken({
      userId    : (user as any)._id,
      tokenHash : tokenHash,
      ipAddress : clientIp,
      deviceName: userAgent,
      expiresAt : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user: { id: userId, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    };
  }
  
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const existingToken = await this.tokenRepository.findByHash(tokenHash);
    if (!existingToken) {
      throw new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401);
    }

    await this.tokenRepository.deleteByHash(tokenHash);
  }

}