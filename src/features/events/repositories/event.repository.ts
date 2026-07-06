import { IEvent, Event } from "../models/event.model";
import {User} from "../../auth/models/user.model";
import mongoose, { Types } from "mongoose";

import { TicketType } from "../models/ticketType.model";
import { Registration } from "../../tickets/models/registration.model";
import { CheckinLogModel } from "../../checkin/models/checkinLog.model";
import { ReviewModel } from "../../reviews/models/review.model";
import e from "cors";
import {EventStaffModel} from "../models/eventStaff.model";

export class EventRepository {
  // UC01 - Danh sách event công khai, có phân trang
  async findPublished(page: number, limit: number): Promise<IEvent[]> {
    const skip = (page - 1) * limit;
    return Event.find({ status: "APPROVED" })
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);
  }

  // UC02 - Chi tiết 1 event
  async findById(id: string): Promise<IEvent | null> {
    return Event.findById(id);
  }

  // UC03 - Tìm kiếm full-text
  async search(keyword: string): Promise<IEvent[]> {
    return Event.find({
      $text: { $search: keyword },
      status: "APPROVED",
    });
  }

  // UC04 - Lọc theo category và/hoặc khoảng thời gian
  async findWithFilters(filters: {
    category?: string;
    startFrom?: Date;
    startTo?: Date;
  }): Promise<IEvent[]> {
    const query: Record<string, unknown> = { status: "APPROVED" };

    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.startFrom || filters.startTo) {
      query.startDate = {
        ...(filters.startFrom && { $gte: filters.startFrom }),
        ...(filters.startTo && { $lte: filters.startTo }),
      };
    }

    return Event.find(query).sort({ startDate: 1 });
  }

  // Đếm tổng số event để tính pagination
  async countPublished(filters: { category?: string } = {}): Promise<number> {
    const query: Record<string, unknown> = { status: "APPROVED" };
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

  // Xóa event theo id
  async deleteById(id: string): Promise<void> {
    await Event.findByIdAndDelete(id);
  }

  // Update attendeeCount khi có registration mới
  async updateByAttendeeCount(_id: string) {
    return Event.updateOne(
      { _id },
      { $inc: { attendeeCount: 1 } }
    );
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

  async getRegistrationCount(eventId: string) {
    return Registration.countDocuments({
      eventId: new mongoose.Types.ObjectId(eventId),
      paymentStatus: "paid",
    } as any);
  }

  // ───── UC17 — Quản lý nhân viên check-in ─────

  // Tìm thông tin User thông qua email
  async findUserByEmail(email: string) {
    return User.findOne({email}).lean();
  }
  // Kiểm tra xem nhân viên đã được gán vào sự kiện này chưa
  async checkStaffAssigned(eventId: string, staffId: string) {
    const count = await EventStaffModel.countDocuments({
      eventId: new Types.ObjectId(eventId),
      staffId: new Types.ObjectId(staffId),
    } as any)
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
    } as any).populate('staffId', 'name email') // Lấy thêm trường name và email từ User collection
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

}
