import { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service";
import { sendSuccess } from "../../shared/utils/response.util";
import {IRevenueReportQueryDto, RevenueReportQuerySchema} from "./dto/revenue-report.dto";

export class AdminController {
  // UC25 — Dashboard tổng quan hệ thống
  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.getSystemDashboard();
      sendSuccess(res, data, "System dashboard");
    } catch (err) {
      next(err);
    }
  };

  // --- UC26: VIEW REVENUE REPORT (BÁO CÁO DOANH THU TOÀN NỀN TẢNG) ---
  getRevenueReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Nhận và Validate dữ liệu từ URL Query Parameters
      const validateQuery: IRevenueReportQueryDto = await RevenueReportQuerySchema.validateAsync(
          req.query,
          {
            abortEarly: false, // Gom tất cả lỗi lại rồi mới báo một lần, không báo lắt nhắt
            stripUnknown: true, // Lọc bỏ những query param "rác" không có trong DTO
          }
      );
      // 2. Chuyển cục dữ liệu "sạch" này xuống tầng Service xử lý
      const data = await adminService.getRevenueReport(validateQuery);

      sendSuccess(res, data, "Lấy báo cáo doanh thu thành công");
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
