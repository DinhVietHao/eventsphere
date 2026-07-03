import { User, IUser } from '../models/user.model';

export class UserRepository {
  // Tìm user theo email phục vụ đăng nhập - Ép lấy thêm trường passwordHash để so sánh bcrypt
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select('+passwordHash').lean();
  }

  // Tìm user theo ID (dùng cho các middleware xác thực sau này)
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).lean();
  }

  // Ghi user mới vào Database
  async create(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    const savedUser = await user.save();
    return savedUser.toObject();
  }

  // Cập nhật trạng thái kích hoạt tài khoản hoặc xác thực email
  async updateStatus(id: string, updateData: { isActive?: boolean; emailVerified?: boolean }): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
  }
}