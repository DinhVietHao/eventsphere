import { escapeRegex } from "../../../shared/utils/regex.util";
import { User, IUser } from "../models/user.model";

export interface IFindAccountsForAdminOptions {
  page: number;
  limit: number;
  keyword?: string;
  role?: string;
  status?: string;
  sort?: string;
}

export interface IFindAccountsForAdminResult {
  users: IUser[];
  totalItems: number;
}

export class UserRepository {
  // Tìm user theo email phục vụ đăng nhập - Ép lấy thêm trường passwordHash để so sánh bcrypt
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select("+passwordHash").lean();
  }

  // Tìm user theo ID (dùng cho các middleware xác thực sau này)
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).lean();
  }

  async findAccountsForAdmin(
    options: IFindAccountsForAdminOptions,
  ): Promise<IFindAccountsForAdminResult> {
    const filter: Record<string, unknown> = {};
    const keyword = options.keyword?.trim();
    const role = options.role?.trim();

    if (keyword) {
      const regex = new RegExp(escapeRegex(keyword), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (role) {
      filter.role = role;
    }

    if (options.status === "active") {
      filter.isActive = true;
    }

    if (options.status === "locked") {
      filter.isActive = false;
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name_asc: { name: 1 },
      name_desc: { name: -1 },
    };
    const sort = sortMap[options.sort || "newest"] || sortMap.newest;
    const skip = (options.page - 1) * options.limit;

    const [users, totalItems] = await Promise.all([
      User.find(filter)
        .select("-passwordHash -emailVerificationToken -googleAccessToken -googleRefreshToken")
        .sort(sort)
        .skip(skip)
        .limit(options.limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return { users, totalItems };
  }

  async findAccountForAdmin(userId: string): Promise<IUser | null> {
    return User.findById(userId)
      .select("-passwordHash -emailVerificationToken -googleAccessToken -googleRefreshToken")
      .populate("lockedBy", "name email role")
      .lean();
  }

  async lockAccount(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<IUser | null> {
    return User.findOneAndUpdate(
      {
        _id: userId,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          lockedReason: reason,
          lockedAt: new Date(),
          lockedBy: adminId,
          unlockedAt: null,
          unlockedBy: null,
        },
      },
      {
        new: true,
      },
    )
      .select("-passwordHash -emailVerificationToken -googleAccessToken -googleRefreshToken")
      .populate("lockedBy", "name email role")
      .lean();
  }

  async unlockAccount(
    userId: string,
    adminId: string,
  ): Promise<IUser | null> {
    return User.findOneAndUpdate(
      {
        _id: userId,
        isActive: false,
      },
      {
        $set: {
          isActive: true,
          lockedReason: null,
          lockedAt: null,
          lockedBy: null,
          unlockedAt: new Date(),
          unlockedBy: adminId,
        },
      },
      {
        new: true,
      },
    )
      .select("-passwordHash -emailVerificationToken -googleAccessToken -googleRefreshToken")
      .lean();
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
