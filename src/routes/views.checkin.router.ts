import { Router } from "express";
import type { Request, Response } from "express";
import { EventService } from "../features/events/events.service";
import { authMiddleware } from "../shared/middlewares/auth.middleware";
import { roleMiddleware } from "../shared/middlewares/role.middleware";
import {User} from "../features/auth/models/user.model";


const checkinViewsRouter = Router();
const eventService = new EventService();

// ==========================================
// UC21 & UC22 — Giao diện Trạm Soát Vé cho Staff
// GET /staff/checkin
// ==========================================
checkinViewsRouter.get(
    "/staff/checkin",
    authMiddleware, // Đọc accessToken từ cookie, gắn thông tin vào req.user
    roleMiddleware("staff", "admin"), // Chặn nếu không phải Staff hoặc Admin
    async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;
            const role = req.user!.role;

            let assignedEvents = [];

            // Phân quyền load danh sách sự kiện đổ vào Dropdown select-box của EJS
            if (role === "admin") {
                // Admin soát vé được thì cho thấy hết các event công khai/đang chạy
                assignedEvents = await eventService.getPublishedEvents(1, 100);
            } else {
                // Staff chỉ thấy được các sự kiện mà mình được Organizer phân công vào mảng hệ thống
                // Sử dụng hàm mà anh em mình vừa bổ sung vào EventService xong
                assignedEvents = await eventService.getEventsByStaffId(userId);
            }

            const fullUserProfile = await User.findById(userId).lean();

            // Render giao diện HTML đúng chuẩn pattern của dự án
            res.render("staff/checkin", {
                events: assignedEvents,          // Danh sách sự kiện cho Dropdown
                user: fullUserProfile || req.user,          // Bắt buộc truyền để Navbar hiển thị trạng thái login
                messages: req.flash?.() || {},   // Flash messages đồng bộ hệ thống
            });

        } catch (error) {
            console.error("Lỗi khi tải giao diện soát vé (EJS):", error);
            res.status(500).send("Lỗi máy chủ khi tải trang soát vé");
        }
    }
);

export default checkinViewsRouter;