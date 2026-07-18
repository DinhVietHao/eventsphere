import { escapeRegex } from "../../../shared/utils/regex.util";
import { User, IUser } from "../models/user.model";

export class UserRepository {
  // Tìm user theo email phục vụ đăng nhập - Ép lấy thêm trường passwordHash để so sánh bcrypt
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select("+passwordHash").lean();
  }

  // Tìm user theo ID (dùng cho các middleware xác thực sau này)
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).lean();
  }

  /**
   * Find organizer IDs matching a keyword by name or email.
   */
  async findOrganizerIdsByKeyword(keyword: string): Promise<string[]> {
    const regex = new RegExp(escapeRegex(keyword), "i");
    const organizers = await User.find({
      role: "organizer",
      $or: [{ name: regex }, { email: regex }],
    })
      .select("_id")
      .lean();

    return organizers.map((organizer) => organizer._id.toString());
  }

  // Ghi user mới vào Database
  async create(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    const savedUser = await user.save();
    return savedUser.toObject();
  }

  // Cập nhật trạng thái kích hoạt tài khoản hoặc xác thực email
  async updateStatus(
    id: string,
    updateData: { isActive?: boolean; emailVerified?: boolean },
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).lean();
  }

  // Cập nhật thông tin profile — chỉ cho phép sửa name, phone, avatar
  async updateProfile(
    id: string,
    updateData: { name?: string; phone?: string; avatar?: string },
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).lean();
    //                                                          ↑ new: true = trả document sau khi update
  }

  // Lấy passwordHash để kiểm tra mật khẩu cũ khi đổi password
  async findByIdWithPassword(id: string): Promise<IUser | null> {
    return User.findById(id).select("+passwordHash").lean();
  }

  // Cập nhật mật khẩu mới (chỉ lưu hash, không bao giờ lưu plain text)
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await User.findByIdAndUpdate(id, { $set: { passwordHash } });
  }
}
