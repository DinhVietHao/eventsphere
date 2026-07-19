import { IEvent } from "../../events/models/event.model";
import { ITicketType } from "../../events/models/ticketType.model";
import { IUser } from "../../auth/models/user.model";

export interface IAccountListQueryDto {
  page: number;
  limit: number;
  keyword?: string;
  role?: "attendee" | "organizer" | "staff" | "admin" | "";
  status?: "active" | "locked" | "";
  sort: "newest" | "oldest" | "name_asc" | "name_desc";
}

export interface IUserIdParamDto {
  userId: string;
}

export interface ILockAccountDto {
  reason: string;
}

export interface IAccountListResult {
  users: IUser[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  filters: {
    keyword: string;
    role: string;
    status: string;
    sort: string;
  };
}

export interface IAccountDetailResult {
  account: IUser;
}

export interface IAccountActionResult {
  user: IUser;
  emailSent: boolean;
}

export interface IPendingEventQueryDto {
  page: number;
  limit: number;
  keyword?: string;
}

export interface IEventIdParamDto {
  eventId: string;
}

export interface IRejectEventDto {
  rejectionReason: string;
}

export interface IOrganizerSummary {
  _id: string;
  name: string;
  email: string;
}

export type IEventWithOrganizer = IEvent & {
  organizerId: IOrganizerSummary;
};

export interface IPendingEventListResult {
  events: IEventWithOrganizer[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  keyword: string;
}

export interface IEventReviewDetailResult {
  event: IEventWithOrganizer;
  ticketTypes: ITicketType[];
}

export interface IEventReviewResult {
  event: IEventWithOrganizer;
  emailSent: boolean;
}
