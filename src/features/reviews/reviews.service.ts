import { Types } from "mongoose";
import { AppError } from "../../shared/errors/AppError";
import { SubmitReviewDto } from "./dto/reviews.dto";
import { ReviewsRepository } from "./repositories/reviews.repository";
import { ReviewUser } from "./type/reviews.type";
import { EventRepository } from "../events/repositories/event.repository";
import { RegistrationRepository } from "../tickets/repositories/registration.repository";
import { TicketRepository } from "../tickets/repositories/ticket.repository";


export class ReviewsService {
  private reviewsRepository: ReviewsRepository;
  private eventRepository: EventRepository;
  private registrationRepository: RegistrationRepository;
  private ticketRepository: TicketRepository;

  constructor() {
    this.reviewsRepository = new ReviewsRepository();
    this.eventRepository = new EventRepository();
    this.registrationRepository = new RegistrationRepository();
    this.ticketRepository = new TicketRepository();
  }

  async submitReview(user: ReviewUser, dto: SubmitReviewDto) {

    const event = await this.eventRepository.findById(dto.eventId);
    if (!event) {
      throw new AppError("Không tìm thấy sự kiện.", 404);
    }

    if (!this.isEventEnded(event)) {
      throw new AppError("Bạn có thể đánh giá sau khi sự kiện kết thúc.", 400);
    }

    const attendanceRegistration = await this.registrationRepository.findAttendanceByEventAndUser(
      dto.eventId,
      user.id,
    );
    const attendanceTicket = await this.ticketRepository.findAttendanceByEventAndUser(
      dto.eventId,
      user.id,
    );
    if (!attendanceRegistration && !attendanceTicket) {
      throw new AppError("Chỉ người đã tham dự mới có thể đánh giá.", 403);
    }

    const existingReview = await this.reviewsRepository.findByEventAndUser(
      dto.eventId,
      user.id,
    );

    const reviewData = {
      rating: dto.rating,
      comment: dto.comment?.trim() || null,
      reviewedAt: new Date(),
    };

    let review;
    if (!existingReview) {
      review = await this.reviewsRepository.createReview({
        eventId: new Types.ObjectId(dto.eventId),
        userId: new Types.ObjectId(user.id),
        ...reviewData,
      });
    } else {
      const hasEdited = await this.reviewsRepository.hasReviewBeenEdited(
        existingReview._id.toString(),
      );

      if (hasEdited) {
        throw new AppError("Bạn chỉ được cập nhật đánh giá một lần.", 400);
      }

      review = await this.reviewsRepository.updateReview(
        existingReview._id.toString(),
        {
          ...reviewData,
          hasEdited: true,
        },
      );
    }
    return {
      review
    };
  }

  async getEventReviewContext(eventId: string, user?: ReviewUser) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new AppError("Không tìm thấy sự kiện.", 404);
    }

    const [reviews, currentUserReview, attendanceRegistration, attendanceTicket] = await Promise.all([
      this.reviewsRepository.findByEvent(eventId),
      user ? this.reviewsRepository.findByEventAndUser(eventId, user.id) : null,
      user ? this.registrationRepository.findAttendanceByEventAndUser(eventId, user.id) : null,
      user ? this.ticketRepository.findAttendanceByEventAndUser(eventId, user.id) : null,
    ]);

    const isEnded = this.isEventEnded(event);
    const canReview = Boolean(
      user &&
      user.role === "attendee" &&
      isEnded &&
      (attendanceRegistration || attendanceTicket),
    );
    console.log("averageRating", event.avgRating);
    return {
      reviews,
      currentUserReview,
      canReview,
      reviewMessage: this.getReviewMessage(user, isEnded, Boolean(attendanceRegistration || attendanceTicket)),
      averageRating: event.avgRating,
      reviewCount: reviews.length,
    };
  }

  private isEventEnded(event: { endDate: Date; status: string }) {
    return event.endDate < new Date() || event.status.toLowerCase() === "ended";
  }

  private getReviewMessage(
    user: ReviewUser | undefined,
    isEnded: boolean,
    hasAttendance: boolean,
  ) {
    if (!user) return "Đăng nhập để đánh giá sự kiện";
    if (!isEnded) return "Bạn có thể đánh giá sau khi sự kiện kết thúc";
    if (user.role !== "attendee" || !hasAttendance) {
      return "Chỉ người đã tham dự mới có thể đánh giá";
    }
    return null;
  }
}
