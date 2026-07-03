<<<<<<< HEAD
// import bcrypt from 'bcryptjs';
// import { UserRepository } from './repositories/user.repository';
// import { TokenRepository } from './repositories/token.repository';
// import { AppError } from '../../shared/errors/AppError';
// import { IAuthResponse } from './types/auth.types';

// export class AuthService {
//   private userRepository: UserRepository;
//   private tokenRepository: TokenRepository;

//   constructor() {
//     this.userRepository = new UserRepository();
//     this.tokenRepository = new TokenRepository();
//   }

//   async register(dto: any): Promise<IAuthResponse> {
//     const existingUser = await this.userRepository.findByEmail(dto.email);
//     if (existingUser) {
//       throw new AppError('Email này đã được sử dụng trên hệ thống', 409);
//     }

//     const salt = await bcrypt.genSalt(10);
//     const passwordHash = await bcrypt.hash(dto.password, salt);

//     const newUser = await this.userRepository.create({
//       name: dto.name,
//       email: dto.email,
//       passwordHash,
//       role: dto.role,
//     });

//     return {
//       user: { id: (newUser as any)._id, name: newUser.name, email: newUser.email, role: newUser.role },
//       accessToken: 'mock_access_token_via_real_repo',
//       refreshToken: 'mock_refresh_token_via_real_repo',
//     };
//   }

//   async login(dto: any, clientIp?: string, userAgent?: string): Promise<IAuthResponse> {
//     const user = await this.userRepository.findByEmail(dto.email);
//     if (!user) {
//       throw new AppError('Email hoặc mật khẩu không chính xác', 401);
//     }

//     if (!user.isActive) {
//       throw new AppError('Tài khoản của bạn đã bị khóa bởi quản trị viên', 403);
//     }

//     const isPasswordMatch = await bcrypt.compare(dto.password, user.passwordHash);
//     if (!isPasswordMatch) {
//       throw new AppError('Email hoặc mật khẩu không chính xác', 401);
//     }

//     // Giả lập lưu Refresh Token vào DB thật để test cơ chế liên kết dữ liệu
//     const mockTokenHash = 'hashed_refresh_token_' + Date.now();
//     await this.tokenRepository.createToken({
//       userId: (user as any)._id,
//       tokenHash: mockTokenHash,
//       ipAddress: clientIp || '127.0.0.1',
//       deviceName: userAgent || 'Unknown Device',
//       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Hết hạn sau 7 ngày
//     });

//     return {
//       user: { id: (user as any)._id, name: user.name, email: user.email, role: user.role },
//       accessToken: 'access_token_approved',
//       refreshToken: mockTokenHash,
//     };
//   }
// }

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRepository } from "./repositories/user.repository";
import { TokenRepository } from "./repositories/token.repository";
import { AppError } from "../../shared/errors/AppError";
import { IAuthResponse } from "./types/auth.types";
import { IUserPayload } from "../../shared/types/express.d";
import { appConfig } from "../../config/app.config";
=======
import bcrypt from "bcrypt";
import crypto from "crypto";
import { IAuthResponse } from "./types/auth.types";
import { AppError } from "../../shared/errors/AppError";
import { UserRepository } from "./repositories/user.repository";
import { TokenRepository } from "./repositories/token.repository";
import { signAccessToken, signRefreshToken } from "../../shared/utils/jwt.util";
>>>>>>> origin/develop

export class AuthService {
  private userRepository = new UserRepository();
  private tokenRepository = new TokenRepository();

  async register(dto: any): Promise<IAuthResponse> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new AppError("Email này đã được sử dụng trên hệ thống", 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
<<<<<<< HEAD
=======

>>>>>>> origin/develop
    const newUser = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });

<<<<<<< HEAD
    const payload: IUserPayload = {
      _id: (newUser as any)._id.toString(),
      email: newUser.email,
      role: newUser.role,
    };

    const accessToken = jwt.sign(payload, appConfig.jwt.accessSecret, {
      expiresIn: appConfig.jwt.accessExpires as any,
    });
    const refreshToken = jwt.sign(
      { _id: payload._id },
      appConfig.jwt.refreshSecret,
      { expiresIn: appConfig.jwt.refreshExpires as any },
    );

    return {
      user: {
        id: payload._id,
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

    if (!user.isActive) throw new AppError("Tài khoản của bạn đã bị khóa", 403);

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch)
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);

    const payload: IUserPayload = {
      _id: (user as any)._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, appConfig.jwt.accessSecret, {
      expiresIn: appConfig.jwt.accessExpires as any,
    });
    const refreshToken = jwt.sign(
      { _id: payload._id },
      appConfig.jwt.refreshSecret,
      { expiresIn: appConfig.jwt.refreshExpires as any },
    );

    // Lưu refresh token vào DB
    await this.tokenRepository.createToken({
      userId: (user as any)._id,
      tokenHash: refreshToken,
      ipAddress: clientIp ?? "127.0.0.1",
      deviceName: userAgent ?? "Unknown",
=======
    const userId = (newUser as any)._id.toString();

    // Tạo JWT
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

    // Hash refresh token trước khi lưu DB — không lưu raw token
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await this.tokenRepository.createToken({
      userId: (newUser as any)._id,
      tokenHash: tokenHash,
>>>>>>> origin/develop
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user: {
<<<<<<< HEAD
        id: payload._id,
        name: user.name,
        email: user.email,
        role: user.role,
=======
        id: userId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
>>>>>>> origin/develop
      },
      accessToken,
      refreshToken,
    };
  }
<<<<<<< HEAD
=======

  async login(
    dto: any,
    clientIp?: string,
    userAgent?: string,
  ): Promise<IAuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);
    }

    if (!user.isActive) {
      throw new AppError("Tài khoản của bạn đã bị khóa bởi quản trị viên", 403);
    }

    const isPasswordMatch = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordMatch) {
      throw new AppError("Email hoặc mật khẩu không chính xác", 401);
    }

    const userId = (user as any)._id.toString();

    // Tạo JWT
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

    // Hash refresh token trước khi lưu DB
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
>>>>>>> origin/develop
}
