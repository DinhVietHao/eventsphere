import Joi from "joi";


export interface IQrCheckinDto {
    registrationId: string;
    eventId: string;
    timestamp: number;
}

export interface IManualCheckinDto {
    registrationId: string;
    eventId: string;
    timestamp?: number;
}

export interface ISearchAttendeeQueryDto {
    eventId: string;
    keyword: string;
}



// UC21: DTO cho luồng Quét mã QR (POST Body)
// Payload đến từ việc giải mã QR code
export const QrCheckinSchema = Joi.object({
    registrationId: Joi.string().hex().length(24).required().messages({
        "string.hex": "registrationId không đúng định dạng",
        "string.length": "registrationId phải là chuỗi 24 ký tự (ObjectId)",
    }),
    eventId: Joi.string().hex().length(24).required(),
    timestamp: Joi.number().integer().positive().required(),
})


// UC22b: DTO cho luồng Duyệt tay sau khi tìm kiếm thủ công (POST Body)
// Payload đến từ nút "Duyệt" trên danh sách kết quả search, không phải từ camera QR
export const ManualCheckinSchema = Joi.object({
    registrationId: Joi.string().hex().length(24).required().messages({
        "string.hex": "registrationId không đúng định dạng",
        "string.length": "registrationId phải là chuỗi 24 ký tự (ObjectId)",
    }),
    eventId: Joi.string().hex().length(24).required(),
    // Không bắt buộc: FE gửi Date.now() nhưng server sẽ tự lấy thời điểm ghi log thực tế
    timestamp: Joi.number().integer().positive().optional(),
})

// UC22: DTO cho luồng Tìm kiếm thủ công (GET Query)
// URL mẫu: /api/v1/checkin/search?eventId=...&keyword=...
export const SearchAttendeeQuerySchema = Joi.object({
    eventId: Joi.string().hex().length(24).required().messages({
        "any.required": "Thiếu eventId trong query",
    }),
    // Giới hạn độ dài từ khóa từ 1 đến 100 ký tự để chống spam query database
    keyword: Joi.string().trim().min(1).max(100).required().messages({
        "string.empty": "Vui lòng nhập từ khóa tìm kiếm (tên hoặc email)",
    }),
});