import Joi from "joi";
import {
  IEventIdParamDto,
  IPendingEventQueryDto,
  IRejectEventDto,
} from "../dto/admin.dto";

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
