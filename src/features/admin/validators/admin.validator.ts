import Joi from "joi";
import {
  IAccountListQueryDto,
  IEventIdParamDto,
  ILockAccountDto,
  IPendingEventQueryDto,
  IRejectEventDto,
  IUserIdParamDto,
} from "../dto/admin.dto";

export const AccountListQuerySchema = Joi.object<IAccountListQueryDto>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  keyword: Joi.string().trim().allow("").optional(),
  role: Joi.string()
    .valid("attendee", "organizer", "staff", "admin")
    .allow("")
    .optional(),
  status: Joi.string().valid("active", "locked").allow("").optional(),
  sort: Joi.string()
    .valid("newest", "oldest", "name_asc", "name_desc")
    .default("newest"),
});

export const UserIdParamSchema = Joi.object<IUserIdParamDto>({
  userId: Joi.string().hex().length(24).required().messages({
    "string.empty": "User ID khong duoc de trong",
    "string.hex": "User ID khong hop le",
    "string.length": "User ID khong hop le",
    "any.required": "User ID la bat buoc",
  }),
});

export const LockAccountSchema = Joi.object<ILockAccountDto>({
  reason: Joi.string().trim().min(10).max(500).required().messages({
    "string.empty": "Ly do khoa khong duoc de trong",
    "string.min": "Ly do khoa phai co it nhat 10 ky tu",
    "string.max": "Ly do khoa khong duoc vuot qua 500 ky tu",
    "any.required": "Ly do khoa la bat buoc",
  }),
});

export const PendingEventQuerySchema = Joi.object<IPendingEventQueryDto>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  keyword: Joi.string().trim().allow("").optional(),
});

export const EventIdParamSchema = Joi.object<IEventIdParamDto>({
  eventId: Joi.string().hex().length(24).required().messages({
    "string.empty": "Event ID không được để trống",
    "string.hex": "Event ID không hợp lệ",
    "string.length": "Event ID không hợp lệ",
    "any.required": "Event ID là bắt buộc",
  }),
});

export const RejectEventSchema = Joi.object<IRejectEventDto>({
  rejectionReason: Joi.string().trim().min(10).max(500).required().messages({
    "string.empty": "Lý do từ chối không được để trống",
    "string.min": "Lý do từ chối phải có ít nhất 10 ký tự",
    "string.max": "Lý do từ chối không được vượt quá 500 ký tự",
    "any.required": "Lý do từ chối là bắt buộc",
  }),
});
