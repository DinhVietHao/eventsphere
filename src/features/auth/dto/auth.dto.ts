import Joi from "joi";

export const RegisterSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required().lowercase(),
  password: Joi.string().min(6).max(30).required(),
  role: Joi.string()
    .valid("attendee", "organizer", "staff", "admin")
    .default("attendee"),
  phone: Joi.string().allow(null, ""),
});

export const LoginSchema = Joi.object({
  email: Joi.string().email().required().lowercase(),
  password: Joi.string().required(),
});

// DTO cho cập nhật thông tin cá nhân
// Client chỉ được phép gửi các field này — role, isActive, passwordHash KHÔNG có ở đây
export const UpdateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  phone: Joi.string()
    .trim()
    .pattern(/^0[0-9]{9}$/)
    .allow(null, "")
    .messages({
      "string.pattern.base":
        "Số điện thoại phải đúng 10 chữ số và bắt đầu bằng 0",
    }),
  avatar: Joi.string().uri().allow(null, ""),
})
  .min(1)
  .messages({
    "object.min": "Cần có ít nhất một trường để cập nhật",
  });

// DTO cho đổi mật khẩu
export const ChangePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Mật khẩu hiện tại là bắt buộc",
  }),
  newPassword: Joi.string().min(6).max(30).required().messages({
    "string.min": "Mật khẩu mới tối thiểu 6 ký tự",
    "any.required": "Mật khẩu mới là bắt buộc",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Xác nhận mật khẩu không khớp",
      "any.required": "Xác nhận mật khẩu là bắt buộc",
    }),
});
