import { Router } from 'express';
import {CheckinRepository} from "./repositories/checkin.repository";
import {CheckinController} from "./checkin.controller";
import {authMiddleware} from "../../shared/middlewares/auth.middleware";
import {roleMiddleware} from "../../shared/middlewares/role.middleware";

const router = Router();

// 1. Khởi tạo các dependency theo đúng Constructor bro vừa chốt
const checkinRepository = new CheckinRepository();
const checkinController = new CheckinController(checkinRepository);

// 2. Khai báo Middleware bảo vệ tuyến đường (Gatekeeper)
// Bắt buộc phải đăng nhập (authMiddleware) và phải là 'staff' hoặc 'admin' (roleMiddleware)
router.use(authMiddleware, roleMiddleware("staff", "admin"));

// ==========================================
// UC21: API Quét mã QR soát vé
// POST /api/v1/checkin/qr
// ==========================================
// Dùng .bind() để giữ nguyên context 'this' cho method class bình thường
router.post("/qr", checkinController.processQrCheckin.bind(checkinController));

// ==========================================
// UC22b: API Duyệt tay sau khi tìm kiếm thủ công
// POST /api/v1/checkin/manual
// ==========================================
// processManualCheckin dùng Arrow Function nên truyền thẳng an toàn, không cần .bind()
router.post("/manual", checkinController.processManualCheckin);

// ==========================================
// UC22: API Tìm kiếm người tham dự (Thủ công)
// GET /api/v1/checkin/search?eventId=...&keyword=...
// ==========================================
// searchAttendee dùng Arrow Function (= async () =>) nên truyền thẳng an toàn
router.get("/search", checkinController.searchAttendee);

export default router;