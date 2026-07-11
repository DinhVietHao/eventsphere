import Joi from "joi";

export interface IRevenueReportQueryDto {
    startDate?: string;
    endDate?: string;
    organizerId?: string;
    category?: "music" | "tech" | "sport" | "education";
    groupBy?: "day" | "week" | "month" | "organizer" | "category";
}

export const RevenueReportQuerySchema = Joi.object({
    startDate: Joi.date().iso().empty("").optional(),

    endDate: Joi.date().iso().empty("").min(Joi.ref("startDate")).optional().messages({
        "date.min": "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu (startDate)",
    }),

    organizerId: Joi.string().hex().length(24).empty("").optional().messages({
        "string.hex": "ID người tổ chức chỉ được chứa các ký tự từ 0-9 và a-f",
        "string.length": "ID người tổ chức phải dài chính xác 24 ký tự (chuẩn MongoDB ObjectId)",
    }),

    category: Joi.string().valid("music", "tech", "sport", "education").empty("").optional(),

    groupBy: Joi.string()
        .valid("day", "week", "month", "organizer", "category")
        .empty("")
        .default("day")
        .messages({
            "any.only": "Trường groupBy chỉ chấp nhận: day, week, month, organizer, category",
        }),
})