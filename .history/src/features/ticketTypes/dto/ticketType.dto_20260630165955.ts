import Joi from "joi";

// Interface — TypeScript dùng để type-check khi gọi service
export interface ICreateTicketTypeDto {
  name: string;
  price: number;
  quota: number;
  description?: string;
}

export interface IUpdateTicketTypeDto {
  name?: string;      // optional vì có thể chỉ sửa 1 field
  price?: number;
  quota?: number;
  description?: string;
}

// Joi schema — validate dữ liệu thực tế từ req.body
export const CreateTicketTypeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  price: Joi.number().min(0).required(),        // min(0) vì vé free = 0đ
  quota: Joi.number().integer().min(1).required(), // ít nhất 1 vé
  description: Joi.string().trim().allow("", null).optional(),
});

export const UpdateTicketTypeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  price: Joi.number().min(0),
  quota: Joi.number().integer().min(1),
  description: Joi.string().trim().allow("", null),
}).min(1); // bắt buộc có ít nhất 1 field khi update
