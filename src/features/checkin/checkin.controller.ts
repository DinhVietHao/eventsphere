import {CheckinService} from "./checkin.service";
import {CheckinRepository} from "./repositories/checkin.repository";
import {NextFunction, Request, Response} from "express";
import {ManualCheckinSchema, QrCheckinSchema, SearchAttendeeQuerySchema} from "./dto/checkin.dto";
import {AppError} from "../../shared/errors/AppError";
import {sendSuccess} from "../../shared/utils/response.util";


export class CheckinController {
    private checkinService: CheckinService;

    constructor(checkinRepository: CheckinRepository) {
        this.checkinService = new CheckinService(checkinRepository);
    }

    // UC21: Controller xử lý Quét mã QR (POST) — method ghi log: 'qr_scan'
    async processQrCheckin  (req: Request, res: Response, next: NextFunction)  {
        try {
            // 1. Validate payload từ req.body bằng Joi DTO
            const { error, value } = QrCheckinSchema.validate(req.body);
            if (error) {
                throw new AppError(error.details[0].message, 400);
            }

            // 2. Lấy staffId từ middleware xác thực
            const staffId = req.user!.id;

            // 3. Gọi Service xử lý nghiệp vụ lõi
            const ticket = await this.checkinService.processQrCheckin(value, staffId);

            // 4. Trả về kết quả JSON chuẩn
            sendSuccess(res, ticket, "Check-in thành công!", 200);

        } catch (error) {
            next(error);
        }
    }

    // UC22b: Controller xử lý Duyệt tay sau khi tìm kiếm thủ công (POST) — method ghi log: 'manual'
    public processManualCheckin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // 1. Validate payload từ req.body bằng Joi DTO
            const { error, value } = ManualCheckinSchema.validate(req.body);
            if (error) {
                throw new AppError(error.details[0].message, 400);
            }

            // 2. Lấy staffId từ middleware xác thực
            const staffId = req.user!.id;

            // 3. Gọi Service xử lý nghiệp vụ lõi
            const ticket = await this.checkinService.processManualCheckin(value, staffId);

            // 4. Trả về kết quả JSON chuẩn
            sendSuccess(res, ticket, "Duyệt vé thành công!", 200);

        } catch (error) {
            next(error);
        }
    }

    // UC22: Controller xử lý Tìm kiếm thủ công (GET)
    public searchAttendee = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // 1. Validate dữ liệu từ URL query
            const { error, value } = SearchAttendeeQuerySchema.validate(req.query, { abortEarly: false });
            if (error) {
                throw new AppError(error.details.map((d) => d.message).join(", "), 400);
            }

            // 2. Gọi Service tìm kiếm
            const tickets = await this.checkinService.searchAttendeeManual(value);

            // 3. Trả về kết quả
            sendSuccess(res, tickets, "Truy xuất danh sách thành công", 200);
        } catch (error) {
            next(error);
        }
    }



}