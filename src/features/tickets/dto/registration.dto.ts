import Joi from "joi";

export interface IRegisterAttendanceDto {
  eventId: string;
  ticketTypeId: string;
}

export const RegisterAttendanceSchema = Joi.object<IRegisterAttendanceDto>({
  eventId: Joi.string().hex().length(24).required(),
  ticketTypeId: Joi.string().hex().length(24).required(),
});