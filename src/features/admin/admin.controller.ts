import { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service";
import { sendSuccess } from "../../shared/utils/response.util";

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
}

export const adminController = new AdminController();
