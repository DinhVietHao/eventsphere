import { IEvent } from "../../events/models/event.model";
import { ITicketType } from "../../events/models/ticketType.model";

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
