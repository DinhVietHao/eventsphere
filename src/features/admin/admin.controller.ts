import { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service";
import { sendSuccess } from "../../shared/utils/response.util";
import { IRevenueReportQueryDto, RevenueReportQuerySchema } from "./dto/revenue-report.dto";
import {
  IAccountListQueryDto,
  IEventIdParamDto,
  ILockAccountDto,
  IPendingEventQueryDto,
  IRejectEventDto,
  IUserIdParamDto,
} from "./dto/admin.dto";
import {
  AccountListQuerySchema,
  EventIdParamSchema,
  LockAccountSchema,
  PendingEventQuerySchema,
  RejectEventSchema,
  UserIdParamSchema,
} from "./validators/admin.validator";
import { AppError } from "../../shared/errors/AppError";

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

  getAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedQuery: IAccountListQueryDto =
        await AccountListQuerySchema.validateAsync(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });

      const data = await adminService.getAccounts(validatedQuery);

      sendSuccess(res, data, "Lay danh sach tai khoan thanh cong");
    } catch (err) {
      next(err);
    }
  };

  getAccountDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams: IUserIdParamDto =
        await UserIdParamSchema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });

      const data = await adminService.getAccountDetail(validatedParams.userId);

      sendSuccess(res, data, "Lay thong tin tai khoan thanh cong");
    } catch (err) {
      next(err);
    }
  };

  lockAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams: IUserIdParamDto =
        await UserIdParamSchema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
      const validatedBody: ILockAccountDto =
        await LockAccountSchema.validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError(
          "Khong xac dinh duoc tai khoan quan tri vien",
          401,
        );
      }

      const data = await adminService.lockAccount(
        validatedParams.userId,
        adminId,
        validatedBody.reason,
      );

      sendSuccess(
        res,
        data,
        data.emailSent
          ? "Khoa tai khoan thanh cong"
          : "Khoa tai khoan thanh cong nhung email chua gui duoc",
      );
    } catch (err) {
      next(err);
    }
  };

  unlockAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams: IUserIdParamDto =
        await UserIdParamSchema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError(
          "Khong xac dinh duoc tai khoan quan tri vien",
          401,
        );
      }

      const data = await adminService.unlockAccount(
        validatedParams.userId,
        adminId,
      );

      sendSuccess(
        res,
        data,
        data.emailSent
          ? "Mo khoa tai khoan thanh cong"
          : "Mo khoa tai khoan thanh cong nhung email chua gui duoc",
      );
    } catch (err) {
      next(err);
    }
  };

  /**
   * UC23 - API: get pending events for review.
   */
  getPendingEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedQuery: IPendingEventQueryDto =
        await PendingEventQuerySchema.validateAsync(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });

      const data = await adminService.getPendingEvents(validatedQuery);

      sendSuccess(
        res,
        data,
        "Lấy danh sách sự kiện chờ duyệt thành công",
      );
    } catch (err) {
      next(err);
    }
  };

  /**
   * UC23 - API: get event detail for review.
   */
  getEventReviewDetail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validatedParams: IEventIdParamDto =
        await EventIdParamSchema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });

      const data = await adminService.getEventReviewDetail(
        validatedParams.eventId,
      );

      sendSuccess(res, data, "Lấy chi tiết sự kiện thành công");
    } catch (err) {
      next(err);
    }
  };

  /**
   * UC23 - API: approve pending event.
   */
  approveEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams: IEventIdParamDto =
        await EventIdParamSchema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError(
          "Không xác định được tài khoản quản trị viên",
          401,
        );
      }

      const data = await adminService.approveEvent(
        validatedParams.eventId,
        adminId,
      );

      sendSuccess(
        res,
        data,
        data.emailSent
          ? "Duyệt sự kiện thành công"
          : "Duyệt sự kiện thành công nhưng email chưa gửi được",
      );
    } catch (err) {
      next(err);
    }
  };

  /**
   * UC23 - API: reject pending event.
   */
  rejectEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams: IEventIdParamDto =
        await EventIdParamSchema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
      const validatedBody: IRejectEventDto =
        await RejectEventSchema.validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError(
          "Không xác định được tài khoản quản trị viên",
          401,
        );
      }

      const data = await adminService.rejectEvent(
        validatedParams.eventId,
        adminId,
        validatedBody.rejectionReason,
      );

      sendSuccess(
        res,
        data,
        data.emailSent
          ? "Từ chối sự kiện thành công"
          : "Từ chối sự kiện thành công nhưng email chưa gửi được",
      );
    } catch (err) {
      next(err);
    }
  };
}

export const adminController = new AdminController();
