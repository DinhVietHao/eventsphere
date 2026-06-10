import Joi from 'joi';

export const RegisterSchema = Joi.object({
  name    : Joi.string().trim().min(2).max(50).required(),
  email   : Joi.string().email().required().lowercase(),
  password: Joi.string().min(6).max(30).required(),
  role    : Joi.string().valid('attendee', 'organizer', 'staff', 'admin').default('attendee'),
  phone   : Joi.string().allow(null, ''),
});

export const LoginSchema = Joi.object({
  email   : Joi.string().email().required().lowercase(),
  password: Joi.string().required(),
});