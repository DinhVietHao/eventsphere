import {TicketModel} from "../../tickets/models/ticket.model";
import {Types} from "mongoose";
import {User} from "../../auth/models/user.model";
import {CheckinLogModel} from "../models/checkinLog.model";


export class CheckinRepository {
    // UC21: Các hàm hỗ trợ Check-in bằng QR
    /**
     * Tìm vé dựa vào registrationId và eventId từ mã QR
     */
    async findTicketForCheckin(registrationId: string, eventId: string) {
        return TicketModel.findOne({
            registrationId: new Types.ObjectId(registrationId),
            eventId: new Types.ObjectId(eventId)
        })
            .populate('attendeeId', 'name email avatar')// Lấy kèm thông tin user để hiển thị lên màn hình Staff
            .populate('ticketTypeId', 'name')// Lấy tên loại vé (VD: VIP, Standard)
    }

    /**
     * Cập nhật trạng thái vé thành CHECKED_IN
     */
    async markTicketAsCheckedIn(ticketId: string) {
        return TicketModel.findByIdAndUpdate(ticketId,
            {status: 'CHECKED_IN'},
            {new: true})// Trả về document sau khi đã update
            .populate('attendeeId', 'name email avatar') // Thêm dòng này để gọi data User
            .populate('ticketTypeId', 'name');           // Thêm dòng này để lấy loại vé
    }

    /**
     * Ghi lại lịch sử check-in vào collection checkin_logs (phục vụ audit/thống kê)
     * Luôn chạy trong cùng transaction với markTicketAsCheckedIn để đảm bảo atomic
     */
    async createCheckinLog(params: {
        ticketId: string;
        eventId: string;
        staffId: string;
        method: 'qr_scan' | 'manual';
    }) {
        const { ticketId, eventId, staffId, method } = params;
        const log = new CheckinLogModel({
            ticketId: new Types.ObjectId(ticketId),
            eventId: new Types.ObjectId(eventId),
            staffId: new Types.ObjectId(staffId),
            method,
        });
        return log.save();
    }

    // UC22: Hàm hỗ trợ Tìm kiếm thủ công
    /**
     * Tìm vé của người tham dự theo eventId và từ khóa (tên hoặc email)
     */
    async searchAttendeeTickets(eventId: string, keyword: string) {
        const matchedUsers = await User.find({
            $or: [
                { name: {$regex: keyword, $options: "i" } },
                { email: {$regex: keyword, $options: "i" } },
            ]
        }).select('_id')
        const userIds = matchedUsers.map(user => user._id);
        // Nếu không tìm thấy user nào khớp, trả về mảng rỗng luôn cho nhanh
        if (userIds.length === 0) {
            return [];
        }
        // Bước 2: Tìm các vé thuộc event này do các User trên sở hữu
        // Chỉ lấy vé còn hợp lệ (ISSUED) — loại CANCELLED/EXPIRED/CHECKED_IN vì
        // những vé đó không thể duyệt check-in được, hiện ra chỉ gây nhầm lẫn cho Staff
        return TicketModel.find({
            eventId: new Types.ObjectId(eventId),
            attendeeId: { $in: userIds },
            status: 'ISSUED',
        }).populate('attendeeId', 'name email avatar')
            .populate('ticketTypeId', 'name')
            .sort({ issuedAt: -1 }) // Sắp xếp vé mới nhất lên đầu
    }

    /**
     * Đếm tổng số vé đã check-in của một sự kiện (Phục vụ cho Dashboard UC20)
     */
    async countCheckedIn(eventId: string): Promise<number> {
        return TicketModel.countDocuments({
            eventId: new Types.ObjectId(eventId),
            status: 'CHECKED_IN'
        });
    }
}

export const checkinRepository = new CheckinRepository();