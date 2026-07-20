import { IEvent, Event } from "../models/event.model";
import { User } from "../../auth/models/user.model";
import mongoose, { Types } from "mongoose";
import { IEventWithOrganizer } from "../../admin/dto/admin.dto";
import { TicketType } from "../models/ticketType.model";
import { Registration } from "../../tickets/models/registration.model";
import { CheckinLogModel } from "../../checkin/models/checkinLog.model";
import { ReviewModel } from "../../reviews/models/review.model";
import { EventStaffModel } from "../models/eventStaff.model";
import { escapeRegex } from "../../../shared/utils/regex.util";

// Trạng thái hiển thị công khai: sự kiện đã duyệt hoặc đang diễn ra.
// ENDED bị loại khỏi danh sách/tìm kiếm công khai nhưng vẫn xem được qua trang chi tiết.
const PUBLIC_STATUSES: IEvent["status"][] = ["APPROVED", "ONGOING"];

export class EventRepository {
  // UC01 - Danh sách event công khai, có phân trang
  async findPublished(page: number, limit: number): Promise<IEvent[]> {
    const skip = (page - 1) * limit;
    return Event.find({ status: { $in: PUBLIC_STATUSES } })
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);
  }

  // UC02 - Chi tiết 1 event
  async findById(id: string): Promise<IEvent | null> {
    return Event.findById(id);
  }

  async findOwnedEventById(
    eventId: string,
    organizerId: string,
  ): Promise<IEvent | null> {
    return Event.findOne({
      _id: new Types.ObjectId(eventId),
      organizerId: new Types.ObjectId(organizerId),
    } as any);
  }

  // UC03 - Tìm kiếm full-text
  async search(keyword: string): Promise<IEvent[]> {
    return Event.find({
      $text: { $search: keyword },
      status: { $in: PUBLIC_STATUSES },
    });
  }

  // Dựng chung query filter (category + khoảng ngày) cho find & count
  private buildFilterQuery(filters: {
    keyword?: string;
    category?: string;
    startFrom?: Date;
    startTo?: Date;
  }): Record<string, unknown> {
    const query: Record<string, unknown> = { status: { $in: PUBLIC_STATUSES } };

    if (filters.keyword && filters.keyword.trim() !== "") {
      query.$text = { $search: filters.keyword.trim() };
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.startFrom || filters.startTo) {
      query.startDate = {
        ...(filters.startFrom && { $gte: filters.startFrom }),
        ...(filters.startTo && { $lte: filters.startTo }),
      };
    }

    return query;
  }

  // UC04 - Lọc theo category và/hoặc khoảng thời gian (+ keyword), có phân trang
  async findWithFilters(
      filters: {
        keyword?: string;
        category?: string;
        startFrom?: Date;
        startTo?: Date;
      },
      page = 1,
      limit = 9,
  ): Promise<IEvent[]> {
    const query = this.buildFilterQuery(filters);
    const skip = (page - 1) * limit;

    return Event.find(query).sort({ startDate: 1 }).skip(skip).limit(limit);
  }

  // Đếm tổng số event khớp filter (category + khoảng ngày + keyword) để tính pagination
  async countWithFilters(filters: {
    keyword?: string;
    category?: string;
    startFrom?: Date;
    startTo?: Date;
  }): Promise<number> {
    return Event.countDocuments(this.buildFilterQuery(filters));
  }

  // Đếm tổng số event để tính pagination
  async countPublished(filters: { category?: string } = {}): Promise<number> {
    const query: Record<string, unknown> = { status: { $in: PUBLIC_STATUSES } };
    if (filters.category) query.category = filters.category;
    return Event.countDocuments(query);
  }

  // ───── UC13 — Organizer CRUD ─────

  // Lấy danh sách events của 1 organizer, có phân trang
  async findByOrganizer(
    organizerId: string,
    page: number,
    limit: number,
  ): Promise<IEvent[]> {
    const skip = (page - 1) * limit;
    return Event.find({ organizerId: new Types.ObjectId(organizerId) } as any)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  // Đếm tổng events của organizer để tính pagination
  async countByOrganizer(organizerId: string): Promise<number> {
    return Event.countDocuments({
      organizerId: new Types.ObjectId(organizerId),
    } as any);
  }

  // Lấy danh sách events đã approved/ongoing/ended của organizer — dùng cho dropdown gửi thông báo
  async findApprovedByOrganizer(organizerId: string): Promise<IEvent[]> {
    return Event.find({
      organizerId: new Types.ObjectId(organizerId),
      status: { $in: ["APPROVED", "ONGOING", "ENDED"] },
    } as any)
      .sort({ startDate: -1 })
      .select("_id title status startDate")
      .lean();
  }

  // Tạo event mới
  async create(data: Partial<IEvent>): Promise<IEvent> {
    return Event.create(data);
  }

  // Cập nhật event theo id
  async updateById(id: string, data: Partial<IEvent>): Promise<IEvent | null> {
    return Event.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      runValidators: true,
    });
  }

  async updateOwnedEventById(
    eventId: string,
    organizerId: string,
    data: Partial<IEvent>,
  ): Promise<IEvent | null> {
    return Event.findOneAndUpdate(
      {
        _id: new Types.ObjectId(eventId),
        organizerId: new Types.ObjectId(organizerId),
      } as any,
      data,
      {
        returnDocument: "after",
        runValidators: true,
      },
    );
  }

  // Xóa event theo id
  async deleteById(id: string): Promise<void> {
    await Event.findByIdAndDelete(id);
  }

  // Update attendeeCount khi có registration mới
  async updateByAttendeeCount(_id: string) {
    return Event.updateOne({ _id }, { $inc: { attendeeCount: 1 } });
  }

  /**
   * Find pending events for admin review with pagination.
   */
  async findPendingForAdmin(options: {
    page: number;
    limit: number;
    keyword?: string;
    organizerIds?: string[];
  }): Promise<{
    events: IEventWithOrganizer[];
    totalItems: number;
  }> {
    const skip = (options.page - 1) * options.limit;
    const filter: Record<string, unknown> = { status: "PENDING" };
    const keyword = options.keyword?.trim();

    if (keyword) {
      const regex = new RegExp(escapeRegex(keyword), "i");
      filter.$or = [
        { title: regex },
        {
          organizerId: {
            $in: (options.organizerIds || []).map(
              (id) => new Types.ObjectId(id),
            ),
          },
        },
      ];
    }

    const [events, totalItems] = await Promise.all([
      Event.find(filter)
        .populate("organizerId", "name email")
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(options.limit),
      Event.countDocuments(filter),
    ]);

    return {
      events: events as unknown as IEventWithOrganizer[],
      totalItems,
    };
  }

  /**
   * Find one event for admin review and include organizer information.
   */
  async findEventForAdminReview(
    eventId: string,
  ): Promise<IEventWithOrganizer | null> {
    return Event.findById(eventId)
      .populate("organizerId", "name email")
      .then((event) => event as IEventWithOrganizer | null);
  }

  /**
   * Atomically approve a pending event.
   */
  async approvePendingEvent(
    eventId: string,
    adminId: string,
  ): Promise<IEventWithOrganizer | null> {
    return Event.findOneAndUpdate(
      {
        _id: new Types.ObjectId(eventId),
        status: "PENDING",
      },
      {
        $set: {
          status: "APPROVED",
          rejectionReason: null,
          reviewedBy: new Types.ObjectId(adminId),
          reviewedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("organizerId", "name email")
      .then((event) => event as unknown as IEventWithOrganizer | null);
  }

  /**
   * Atomically reject a pending event and move it back to draft.
   */
  async rejectPendingEvent(
    eventId: string,
    adminId: string,
    rejectionReason: string,
  ): Promise<IEventWithOrganizer | null> {
    return Event.findOneAndUpdate(
      {
        _id: new Types.ObjectId(eventId),
        status: "PENDING",
      },
      {
        $set: {
          status: "DRAFT",
          rejectionReason,
          reviewedBy: new Types.ObjectId(adminId),
          reviewedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("organizerId", "name email")
      .then((event) => event as unknown as IEventWithOrganizer | null);
  }

  //UC-19-20

  // Đếm registrations đã paid theo từng ticketTypeId
  async getRegistrationStats(eventId: string) {
    return Registration.aggregate([
      {
        // getRegistrationStats — chỗ $match trong aggregate
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: "$ticketTypeId",
          count: { $sum: 1 },
        },
      },
    ]);
    // Trả về: [{ _id: ObjectId, count: number }, ...]
  }

  // Đếm tổng check-in của sự kiện
  async getCheckinCount(eventId: string) {
    return CheckinLogModel.countDocuments({
      eventId: new mongoose.Types.ObjectId(eventId),
    } as any);
  }

  // Lấy tất cả ticket types của sự kiện
  async getTicketTypes(eventId: string) {
    return TicketType.find({
      eventId: new mongoose.Types.ObjectId(eventId),
    } as any).lean();
  }

  // Đếm số lượt review
  async getReviewCount(eventId: string) {
    return ReviewModel.countDocuments({
      eventId: new mongoose.Types.ObjectId(eventId),
    } as any);
  }

  // Tính avgRating trực tiếp từ collection reviews — dùng cho báo cáo
  async getAvgRating(eventId: string): Promise<number> {
    const result = await ReviewModel.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);
    return result[0]?.avg ? Number(result[0].avg.toFixed(1)) : 0;
  }

  async getRegistrationCount(eventId: string) {
    return Registration.countDocuments({
      eventId: new mongoose.Types.ObjectId(eventId),
      paymentStatus: "paid",
    } as any);
  }

  // Đếm số registrations của nhiều event cùng lúc — dùng cho danh sách organizer
  async countRegistrationsByEventIds(
    eventIds: string[],
  ): Promise<Map<string, number>> {
    const result = await Registration.aggregate([
      {
        $match: {
          eventId: {
            $in: eventIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: "$eventId",
          count: { $sum: 1 },
        },
      },
    ]);

    const map = new Map<string, number>();
    for (const row of result) {
      map.set(row._id.toString(), row.count);
    }
    return map;
  }

  // ───── Tự động chuyển trạng thái event theo thời gian ─────

  // APPROVED -> ONGOING khi đã đến giờ bắt đầu
  async startApprovedEvents(now: Date): Promise<string[]> {
    const events = await Event.find({
      status: "APPROVED",
      startDate: { $lte: now },
    }).select("_id");
    const ids = events.map((e) => (e._id as Types.ObjectId).toString());
    if (ids.length > 0) {
      await Event.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "ONGOING" } },
      );
    }
    return ids;
  }

  // ONGOING -> ENDED khi đã đến giờ kết thúc
  async endOngoingEvents(now: Date): Promise<string[]> {
    const events = await Event.find({
      status: "ONGOING",
      endDate: { $lte: now },
    }).select("_id");
    const ids = events.map((e) => (e._id as Types.ObjectId).toString());
    if (ids.length > 0) {
      await Event.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "ENDED" } },
      );
    }
    return ids;
  }

  // PENDING quá hạn (createdAt <= cutoff) mà chưa được duyệt -> CANCELLED
  async cancelStalePendingEvents(cutoff: Date): Promise<string[]> {
    const events = await Event.find({
      status: "PENDING",
      createdAt: { $lte: cutoff },
    }).select("_id");
    const ids = events.map((e) => (e._id as Types.ObjectId).toString());
    if (ids.length > 0) {
      await Event.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            status: "CANCELLED",
            rejectionReason: "Tự động hủy do quá 3 ngày không được duyệt",
          },
        },
      );
    }
    return ids;
  }

  // Tính tổng quota (tổng số vé) của nhiều event cùng lúc — dùng cho danh sách organizer
  async sumQuotaByEventIds(eventIds: string[]): Promise<Map<string, number>> {
    const result = await TicketType.aggregate([
      {
        $match: {
          eventId: { $in: eventIds.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      },
      {
        $group: {
          _id: "$eventId",
          totalQuota: { $sum: "$quota" },
        },
      },
    ]);

    const map = new Map<string, number>();
    for (const row of result) {
      map.set(row._id.toString(), row.totalQuota);
    }
    return map;
  }

  // ───── UC17 — Quản lý nhân viên check-in ─────

  // Tìm thông tin User thông qua email
  async findUserByEmail(email: string) {
    return User.findOne({ email }).lean();
  }
  // Kiểm tra xem nhân viên đã được gán vào sự kiện này chưa
  async checkStaffAssigned(eventId: string, staffId: string) {
    const count = await EventStaffModel.countDocuments({
      eventId: new Types.ObjectId(eventId),
      staffId: new Types.ObjectId(staffId),
    } as any);
    return count > 0;
  }

  // Thêm nhân viên vào sự kiện
  async addStaffToEvent(eventId: string, staffId: string, assignedBy: string) {
    return EventStaffModel.create({
      eventId: new Types.ObjectId(eventId),
      staffId: new Types.ObjectId(staffId),
      assignedBy: new Types.ObjectId(assignedBy),
    } as any);
  }

  // Xóa nhân viên khỏi sự kiện
  async removeStaffFromEvent(eventId: string, staffId: string): Promise<void> {
    await EventStaffModel.deleteOne({
      eventId: new Types.ObjectId(eventId),
      staffId: new Types.ObjectId(staffId),
    } as any);
  }

  async getStaffsByEventId(eventId: string) {
    const staffAssignments = await EventStaffModel.find({
      eventId: new Types.ObjectId(eventId),
    } as any)
      .populate("staffId", "name email") // Lấy thêm trường name và email từ User collection
      .lean();
    // Mapping lại mảng dữ liệu cho phẳng (phù hợp với cấu trúc EJS đang cần)
    return staffAssignments.map((assignment: any) => {
      const user = assignment.staffId;
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        assignedAt: assignment.assignedAt,
      };
    });
  }

  //uc21 22
  /**
   * Lấy danh sách sự kiện dựa vào ID của nhân viên (Staff)
   * Sử dụng bảng trung gian EventStaff
   */
  async getEventsByStaffId(staffId: string) {
    // Bước 1: Tìm tất cả các bản ghi phân công của Staff này trong bảng event_staff
    const assignments = await EventStaffModel.find({
      staffId: staffId as any,
    }).select("eventId");

    if (assignments.length === 0) {
      return [];
    }

    // FIX TẠI ĐÂY: Thêm .toString() để chuyển mảng ObjectId thành mảng String
    const eventIds = assignments.map((assignment) =>
      assignment.eventId.toString(),
    );

    // Bước 2: Query bình thường, Mongoose tự động ép chuỗi về lại ObjectId
    return Event.find({
      _id: { $in: eventIds }, // Hết lỗi đỏ ngay lập tức!
      status: { $in: ["APPROVED", "ONGOING"] },
    })
      .select("_id title startDate endDate status")
      .sort({ startDate: 1 }); // Sắp xếp sự kiện gần nhất lên đầu
  }
}
