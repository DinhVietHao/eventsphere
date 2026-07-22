import { Types } from "mongoose";
import { getIO } from "../../config/socket";
import { AppError } from "../../shared/errors/AppError";
import { EmailService } from "../../shared/services/email.service";
import { generateTicketQrCode } from "../../shared/utils/qrCode.util";
import { UserRepository } from "../auth/repositories/user.repository";
import { EventRepository } from "../events/repositories/event.repository";
import { TicketTypeRepository } from "../events/repositories/ticketType.repository";
import { IRegisterAttendanceDto } from "./dto/registration.dto";
import { RegistrationRepository } from "./repositories/registration.repository";
import { TicketRepository } from "./repositories/ticket.repository";

export const EVENT_REGISTRATION_CLOSED_MESSAGE =
  "Sự kiện đã bắt đầu hoặc đã kết thúc. Bạn không thể đăng ký hoặc mua vé.";

export class TicketsService {
  private registrationRepository: RegistrationRepository;
  private ticketRepository: TicketRepository;
  private ticketTypeRepository: TicketTypeRepository;
  private userRepository: UserRepository;
  private eventRepository: EventRepository;
  private emailService: EmailService;

  constructor() {
    this.registrationRepository = new RegistrationRepository();
    this.ticketRepository = new TicketRepository();
    this.ticketTypeRepository = new TicketTypeRepository();
    this.userRepository = new UserRepository();
    this.eventRepository = new EventRepository();
    this.emailService = new EmailService();
  }

  async registerAttendance(
    attendeeId: string,
    iRegisterAttendanceDto: IRegisterAttendanceDto,
  ) {
    if (
      !Types.ObjectId.isValid(attendeeId) ||
      !Types.ObjectId.isValid(iRegisterAttendanceDto.eventId) ||
      !Types.ObjectId.isValid(iRegisterAttendanceDto.ticketTypeId)
    ) {
      throw new AppError("Thông tin đăng ký không hợp lệ.", 400);
    }

    const attendee = await this.userRepository.findById(attendeeId);
    if (!attendee) throw new AppError("Không tìm thấy người tham dự.", 404);

    const event = await this.eventRepository.findById(
      iRegisterAttendanceDto.eventId,
    );
    if (!event) throw new AppError("Không tìm thấy sự kiện.", 404);
    if (event.status === "CANCELLED") {
      throw new AppError(
        "Sự kiện đã bị hủy. Bạn không thể đăng ký hoặc mua vé.",
        400,
      );
    }
    if (event.status !== "APPROVED") {
      throw new AppError("Sự kiện hiện không cho phép đăng ký tham dự.", 400);
    }
    this.assertEventCanAcceptRegistration(event);

    const ticketType = await this.ticketTypeRepository.findByEventAndTicketType(
      iRegisterAttendanceDto.eventId,
      iRegisterAttendanceDto.ticketTypeId,
    );
    if (!ticketType) throw new AppError("Loại vé không tồn tại.", 404);

    const isFreeTicket = Number(ticketType.price) === 0;
    const existingRegistration =
      await this.registrationRepository.findLatestByAttendeeAndEvent(
        attendeeId,
        iRegisterAttendanceDto.eventId,
      );

    if (existingRegistration) {
      const canChangeTicketType = [
        "pending_payment",
        "cancelled",
        "payment_failed",
      ].includes(existingRegistration.status);

      if (!canChangeTicketType) {
        return this.buildRegistrationResult(existingRegistration);
      }
    }

    if (!isFreeTicket) {
      if (ticketType.sold >= ticketType.quota) {
        throw new AppError("Vé đã được bán hết.", 400);
      }

      const registration = existingRegistration
        ? await this.registrationRepository.resetForRetry(
          existingRegistration._id.toString(),
          {
            ticketTypeId: new Types.ObjectId(
              iRegisterAttendanceDto.ticketTypeId,
            ),
            status: "pending_payment",
            paymentStatus: "unpaid",
          },
        )
        : await this.createPendingRegistration(
          attendeeId,
          iRegisterAttendanceDto.eventId,
          iRegisterAttendanceDto.ticketTypeId,
        );

      if (!registration) throw new AppError("Đăng ký tham dự thất bại.", 500);

      return {
        registration,
        ticket: null,
        payment: {
          amount: Number(ticketType.price),
          currency: "VND",
        },
        nextStep: "payment_required",
      };
    }

    const reservedTicketType = await this.ticketTypeRepository.reserveTicket(
      iRegisterAttendanceDto.ticketTypeId,
      iRegisterAttendanceDto.eventId,
    );
    if (!reservedTicketType) throw new AppError("Vé đã được bán hết.", 400);

    try {
      const registration = existingRegistration
        ? await this.registrationRepository.resetForRetry(
          existingRegistration._id.toString(),
          {
            ticketTypeId: new Types.ObjectId(
              iRegisterAttendanceDto.ticketTypeId,
            ),
            status: "confirmed",
            paymentStatus: "free",
          },
        )
        : await this.registrationRepository.create({
          _id: new Types.ObjectId(),
          userId: new Types.ObjectId(attendeeId),
          eventId: new Types.ObjectId(iRegisterAttendanceDto.eventId),
          ticketTypeId: new Types.ObjectId(
            iRegisterAttendanceDto.ticketTypeId,
          ),
          status: "confirmed",
          paymentStatus: "free",
          registeredAt: new Date(),
        });

      if (!registration) throw new AppError("Đăng ký tham dự thất bại.", 500);

      const ticket = await this.createTicketForRegistration(
        registration._id.toString(),
        reservedTicketType,
      );

      return {
        registration,
        ticket,
        nextStep: "ticket_issued",
      };
    } catch (error) {
      await this.ticketTypeRepository.releaseTicket(
        iRegisterAttendanceDto.ticketTypeId,
        iRegisterAttendanceDto.eventId,
      );
      throw error;
    }
  }

  async getExistingBookingResult(attendeeId: string, eventId: string) {
    const registration =
      await this.registrationRepository.findLatestByAttendeeAndEvent(
        attendeeId,
        eventId,
      );

    if (!registration) return null;
    if (
      ["pending_payment", "cancelled", "payment_failed"].includes(
        registration.status,
      )
    ) {
      return null;
    }

    return this.buildRegistrationResult(registration);
  }

  private async buildRegistrationResult(registration: any) {
    const ticket = await this.ticketRepository.findByRegistrationIdPlain(
      registration._id.toString(),
    );

    if (ticket) {
      return {
        registration,
        ticket,
        nextStep: "ticket_issued",
      };
    }

    if (registration.status === "confirmed") {
      throw new AppError(
        "Đăng ký đã được xác nhận nhưng không tìm thấy vé.",
        409,
      );
    }

    const ticketType = await this.ticketTypeRepository.findByEventAndTicketType(
      registration.eventId.toString(),
      registration.ticketTypeId.toString(),
    );

    return {
      registration,
      ticket: null,
      payment: {
        amount: Number(ticketType?.price ?? 0),
        currency: "VND",
      },
      nextStep: "payment_required",
    };
  }

  private async createPendingRegistration(
    attendeeId: string,
    eventId: string,
    ticketTypeId: string,
  ) {
    try {
      return await this.registrationRepository.create({
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(attendeeId),
        eventId: new Types.ObjectId(eventId),
        ticketTypeId: new Types.ObjectId(ticketTypeId),
        status: "pending_payment",
        paymentStatus: "unpaid",
        registeredAt: new Date(),
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        const registration =
          await this.registrationRepository.findLatestByAttendeeAndEvent(
            attendeeId,
            eventId,
          );
        if (registration) return registration;
      }

      throw error;
    }
  }

  private assertEventCanAcceptRegistration(event: { startDate: Date }) {
    const eventStartAt = new Date(event.startDate);
    if (Number.isNaN(eventStartAt.getTime()) || new Date() >= eventStartAt) {
      throw new AppError(EVENT_REGISTRATION_CLOSED_MESSAGE, 400);
    }
  }

  async issueTicketForRegistration(registrationId: string) {
    if (!Types.ObjectId.isValid(registrationId)) {
      throw new AppError("Mã đăng ký không hợp lệ.", 400);
    }

    const existingTicket =
      await this.ticketRepository.findByRegistrationIdPlain(registrationId);
    if (existingTicket) return existingTicket;

    const registration =
      await this.registrationRepository.findById(registrationId);
    if (!registration)
      throw new AppError("Không tìm thấy thông tin đăng ký.", 404);
    if (
      registration.status === "cancelled" ||
      registration.status === "payment_failed"
    ) {
      throw new AppError(
        "Đăng ký này không đủ điều kiện để phát hành vé.",
        400,
      );
    }

    const reservedTicketType = await this.ticketTypeRepository.reserveTicket(
      registration.ticketTypeId.toString(),
      registration.eventId.toString(),
    );
    if (!reservedTicketType) throw new AppError("Vé đã được bán hết.", 400);

    try {
      return await this.createTicketForRegistration(
        registrationId,
        reservedTicketType,
      );
    } catch (error) {
      await this.ticketTypeRepository.releaseTicket(
        registration.ticketTypeId.toString(),
        registration.eventId.toString(),
      );
      throw error;
    }
  }

  private async createTicketForRegistration(
    registrationId: string,
    reservedTicketType: { name: string },
  ) {
    const existingTicket =
      await this.ticketRepository.findByRegistrationIdPlain(registrationId);
    if (existingTicket) return existingTicket;

    const registration =
      await this.registrationRepository.findById(registrationId);
    if (!registration)
      throw new AppError("Không tìm thấy thông tin đăng ký.", 404);

    const [attendee, event] = await Promise.all([
      this.userRepository.findById(registration.userId.toString()),
      this.eventRepository.findById(registration.eventId.toString()),
    ]);

    if (!attendee)
      throw new AppError("Không tìm thấy thông tin người tham dự.", 404);
    if (!event) throw new AppError("Không tìm thấy thông tin sự kiện.", 404);

    const qrCode = await generateTicketQrCode({
      registrationId: registration._id.toString(),
      eventId: registration.eventId.toString(),
      timestamp: Date.now(),
    });

    const ticketResult = await this.ticketRepository.create({
      registrationId: registration._id,
      attendeeId: registration.userId,
      eventId: registration.eventId,
      ticketTypeId: registration.ticketTypeId,
      qrCode,
      status: "ISSUED",
      issuedAt: new Date(),
      expiredAt: event.endDate,
    });
    const ticket = ticketResult.ticket;

    if (ticketResult.created) {
      await this.eventRepository.updateByAttendeeCount(
        registration.eventId.toString(),
      );

      try {
        const eventId = registration.eventId.toString();
        const { CheckinRepository } =
          await import("../checkin/repositories/checkin.repository");
        const checkinRepo = new CheckinRepository();
        const totalRegistered = await checkinRepo.countRegistered(eventId);
        getIO().to(eventId).emit("registration_update", { totalRegistered });
      } catch (err) {
        console.error("Lỗi emit registration_update:", err);
      }

      try {
        await this.emailService.sendTicketEmail({
          to: attendee.email,
          attendeeName: attendee.name,
          eventTitle: event.title,
          ticketTypeName: reservedTicketType.name,
          qrCode,
        });
      } catch (mailError) {
        console.error("Gửi email vé thất bại:", mailError);
      }
    }

    return ticket;
  }

  async getTicketDetail(ticketId: string, attendeeId: string) {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError("Mã vé không hợp lệ.", 400);
    }

    const ticket = await this.ticketRepository.findDetailById(
      ticketId,
      attendeeId,
    );
    if (!ticket) {
      throw new AppError("Không tìm thấy vé.", 404);
    }

    return ticket;
  }

  async getAttendanceHistory(attendeeId: string, page = 1, limit = 10) {
    if (!Types.ObjectId.isValid(attendeeId)) {
      throw new AppError("Người dùng không hợp lệ.", 400);
    }

    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;

    const { registrations, totalItems } =
      await this.registrationRepository.findHistoryByAttendee(
        attendeeId,
        safePage,
        safeLimit,
      );
    const tickets = await this.ticketRepository.findByRegistrationIds(
      registrations.map((registration) => registration._id.toString()),
    );
    const ticketsByRegistrationId = new Map(
      tickets.map((ticket) => [ticket.registrationId.toString(), ticket]),
    );

    const items = registrations.map((registration) => {
      const ticket =
        ticketsByRegistrationId.get(registration._id.toString()) || null;

      return {
        registration,
        ticket,
        event: registration.eventId || null,
        ticketType: registration.ticketTypeId || null,
        displayStatus: this.getAttendanceDisplayStatus(registration, ticket),
      };
    });

    return {
      items,
      currentPage: safePage,
      totalPages: Math.max(1, Math.ceil(totalItems / safeLimit)),
      totalItems,
      limit: safeLimit,
    };
  }

  private getAttendanceDisplayStatus(registration: any, ticket: any) {
    const event = registration.eventId;
    const eventStatus = event?.status;
    const eventEndDate = event?.endDate ? new Date(event.endDate) : null;

    if (eventStatus === "CANCELLED" || registration.status === "cancelled") {
      return "Đã hủy";
    }

    if (registration.status === "payment_failed") {
      return "Thanh toán thất bại";
    }

    if (registration.status === "pending_payment" || !ticket) {
      return "Chờ thanh toán";
    }

    if (ticket.status === "CHECKED_IN") {
      return "Đã tham dự";
    }

    if (eventEndDate && eventEndDate < new Date()) {
      return "Đã kết thúc";
    }

    return "Sắp diễn ra";
  }
}
