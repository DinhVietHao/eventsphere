import { UserModel, IUserDocument } from '../models/user.model';

export class UserRepository {
  // Tìm user theo email phục vụ đăng nhập - Ép lấy thêm trường passwordHash để so sánh bcrypt
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email }).select('+passwordHash').lean();
  }

  // Tìm user theo ID (dùng cho các middleware xác thực sau này)
  async findById(id: string): Promise<IUserDocument | null> {
    return UserModel.findById(id).lean();
  }

  // Ghi user mới vào Database (UC05)
  async create(userData: Partial<IUserDocument>): Promise<IUserDocument> {
    const user = new UserModel(userData);
    const savedUser = await user.save();
    return savedUser.toObject();
  }

  // Cập nhật trạng thái kích hoạt tài khoản hoặc xác thực email
  async updateStatus(id: string, updateData: { isActive?: boolean; emailVerified?: boolean }): Promise<IUserDocument | null> {
    return UserModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
  }
}