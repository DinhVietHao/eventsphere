import {IManualCheckinDto, IQrCheckinDto, ISearchAttendeeQueryDto} from "./dto/checkin.dto";
import {CheckinRepository} from "./repositories/checkin.repository";
import {AppError} from "../../shared/errors/AppError";
import {getIO} from "../../config/socket";


export class CheckinService {
    private checkinRepository: CheckinRepository;

    constructor(checkinRepository: CheckinRepository) {
        this.checkinRepository = checkinRepository;
    }

    // UC21: Xử lý nghiệp vụ Check-in bằng QR (quét camera)
    async processQrCheckin(payload: IQrCheckinDto, staffId: string) {
        const { registrationId, eventId } = payload;
        return this.performCheckin(registrationId, eventId, staffId, 'qr_scan');
    }

    // UC22b: Xử lý nghiệp vụ Duyệt tay sau khi tìm kiếm thủ công
    async processManualCheckin(payload: IManualCheckinDto, staffId: string) {
        const { registrationId, eventId } = payload;
        return this.performCheckin(registrationId, eventId, staffId, 'manual');
    }

    // Lõi xử lý check-in dùng chung cho cả 2 luồng QR & Manual
    private async performCheckin(
        registrationId: string,
        eventId: string,
        staffId: string,
        method: 'qr_scan' | 'manual',
    ) {
        // 1. Lấy thông tin vé từ DB
        const ticket = await this.checkinRepository.findTicketForCheckin(registrationId, eventId);
        if (!ticket) {
            throw new AppError("Vé không tồn tại hoặc không thuộc sự kiện này.", 404);
        }
        if (ticket.status === "CHECKED_IN") {
            throw new AppError("Vé này đã được check-in trước đó!", 400);
        }
        if (ticket.status === "CANCELLED" || ticket.status === "EXPIRED") {
            throw new AppError(`Vé không hợp lệ. Trạng thái hiện tại: ${ticket.status}`, 400);
        }

        // 2. Cập nhật trạng thái vé thành CHECKED_IN
        const updatedTicket = await this.checkinRepository.markTicketAsCheckedIn(ticket._id.toString());
        if (!updatedTicket) {
            throw new AppError("Đã xảy ra lỗi hệ thống khi cập nhật trạng thái vé.", 500);
        }

        // 3. Ghi lịch sử check-in (audit log)
        // Bọc try-catch riêng: vé đã check-in thành công là ưu tiên số 1, lỡ ghi log lỗi
        // (VD: DB chập chờn) thì vẫn báo thành công cho Staff, chỉ log lỗi ra console để dev soát lại sau.
        try {
            await this.checkinRepository.createCheckinLog({
                ticketId: updatedTicket._id.toString(),
                eventId,
                staffId,
                method,
            });
        } catch (error) {
            console.error("Lỗi khi ghi CheckinLog:", error);
        }

        // 4. Phát sự kiện Realtime qua Socket.io
        try {
            const checkInCount = await this.checkinRepository.countCheckedIn(eventId);
            const attendeeName = (updatedTicket.attendeeId as any).name;

            getIO().to(eventId).emit("checkin_update", {
                eventId,
                checkInCount,
                attendeeName,
                message: `${attendeeName} vừa check-in thành công!`
            });
            console.log(`[Socket] Đã emit checkin_update cho room: ${eventId}`);
        } catch (error) {
            // Bọc try-catch để lỡ Socket chết thì API check-in vẫn báo thành công cho app
            console.error("Lỗi khi emit socket update check-in:", error);
        }

        return updatedTicket;
    }

    // UC22: Xử lý nghiệp vụ Tìm kiếm thủ công
    async searchAttendeeManual(query: ISearchAttendeeQueryDto) {
        const { eventId, keyword } = query;
        return await this.checkinRepository.searchAttendeeTickets(eventId, keyword);
    }


}