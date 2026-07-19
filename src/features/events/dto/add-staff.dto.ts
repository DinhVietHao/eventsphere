import Joi from "joi";


export interface IAddStaffDTO {
    email: string;
}

export const AddStaffSchema= Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.base': 'Email phải là một chuỗi ký tự.',
            'string.empty': 'Email không được để trống.',
            'string.email': 'Định dạng email không hợp lệ.',
            'any.required': 'Vui lòng cung cấp email của nhân viên cần thêm.'
        })
});