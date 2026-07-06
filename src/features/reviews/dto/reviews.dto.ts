import Joi from "joi";

export interface SubmitReviewDto {
  eventId: string;
  rating: number;
  comment?: string | null;
}

export const SubmitReviewSchema = Joi.object<SubmitReviewDto>({
  eventId: Joi.string().hex().length(24).required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(500).allow("", null).optional(),
});
