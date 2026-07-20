import Joi from "joi";

export interface ICreateEventDto {
  title: string;
  description: string;
  category: "music" | "tech" | "sport" | "education";
  location: string;
  startDate: string;
  endDate: string;
  bannerUrl?: string;
  actionType?: "draft" | "submit";
}

export interface IUpdateEventDto {
  title?: string;
  description?: string;
  category?: "music" | "tech" | "sport" | "education";
  location?: string;
  startDate?: string;
  endDate?: string;
  bannerUrl?: string;
}

export const CreateEventSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().min(10).required(),
  category: Joi.string()
    .valid("music", "tech", "sport", "education")
    .required(),
  location: Joi.string().trim().required(),
  startDate: Joi.date().iso().greater("now").required(),
  endDate: Joi.date().iso().greater(Joi.ref("startDate")).required(),
  bannerUrl: Joi.string().trim().max(2048).allow(null, "").optional(),
  actionType: Joi.string().valid("draft", "submit").default("draft"),
});

export const UpdateEventSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100),
  description: Joi.string().trim().min(10),
  category: Joi.string().valid("music", "tech", "sport", "education"),
  location: Joi.string().trim(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref("startDate")),
  bannerUrl: Joi.string().trim().max(2048).allow(null, "").optional(),
}).min(1);
