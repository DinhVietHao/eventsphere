import { Types } from 'mongoose';
import { RefreshTokenModel, IRefreshTokenDocument } from '../models/refreshToken.model';

export class TokenRepository {
  // Lưu token hash mới khi user đăng nhập thành công
  async createToken(tokenData: Partial<IRefreshTokenDocument>): Promise<IRefreshTokenDocument> {
    const token = new RefreshTokenModel(tokenData);
    const savedToken = await token.save();
    return savedToken.toObject();
  }

  // Tìm kiếm token phục vụ luồng Refresh Token (Cấp lại Access Token mới)
  async findByHash(tokenHash: string): Promise<IRefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({ tokenHash }).lean();
  }

  // Xóa token cụ thể khi User bấm Đăng xuất (Logout)
  async deleteByHash(tokenHash: string): Promise<void> {
    await RefreshTokenModel.deleteOne({ tokenHash });
  }

  // Thu hồi toàn bộ phiên đăng nhập của 1 user (Dùng khi đổi mật khẩu hoặc bị Admin BAN tài khoản)
  async revokeAllByUserId(userId: string): Promise<void> {
    await RefreshTokenModel.deleteMany({ 
      userId: userId as any
    });
  }
}