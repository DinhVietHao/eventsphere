import { Types } from 'mongoose';
import { RefreshToken, IRefreshToken } from '../models/refreshToken.model';

export class TokenRepository {
  // Lưu token hash mới khi user đăng nhập thành công
  async createToken(tokenData: Partial<IRefreshToken>): Promise<IRefreshToken> {
    const token = new RefreshToken(tokenData);
    const savedToken = await token.save();
    return savedToken.toObject();
  }

  // Tìm kiếm token phục vụ luồng Refresh Token (Cấp lại Access Token mới)
  async findByHash(tokenHash: string): Promise<IRefreshToken | null> {
    return RefreshToken.findOne({ tokenHash }).lean();
  }

  // Xóa token cụ thể khi User bấm Đăng xuất (Logout)
  async deleteByHash(tokenHash: string): Promise<void> {
    await RefreshToken.deleteOne({ tokenHash });
  }

  // Thu hồi toàn bộ phiên đăng nhập của 1 user (Dùng khi đổi mật khẩu hoặc bị Admin BAN tài khoản)
  async revokeAllByUserId(userId: string): Promise<void> {
    await RefreshToken.deleteMany({ 
      userId: userId as any
    });
  }
}