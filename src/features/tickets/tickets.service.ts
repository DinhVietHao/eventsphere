import { Types } from "mongoose";
import { EmailService } from "../../shared/services/email.service";
import { AppError } from "../../shared/errors/AppError";
import { generateTicketQrCode } from "../../shared/utils/qrCode.util";
import { UserRepository } from "../auth/repositories/user.repository";
import { EventRepository } from "../events/repositories/event.repository";
import { TicketTypeRepository } from "../events/repositories/ticketType.repository";
import { IRegisterAttendanceDto } from "./dto/registration.dto";
import { RegistrationRepository } from "./repositories/registration.repository";
import { TicketRepository } from "./repositories/ticket.repository";

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
        const attendee = await this.userRepository.findById(attendeeId);
        if (!attendee) throw new AppError("Không tìm thấy người tham dự.", 404);

        const event = await this.eventRepository.findById(iRegisterAttendanceDto.eventId);
        if (!event) throw new AppError("Không tìm thấy sự kiện.", 404);
        if (!["APPROVED", "ONGOING"].includes(event.status)) {
            throw new AppError("Sự kiện hiện không cho phép đăng ký tham dự.", 400);
        }

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

            const registration =
                existingRegistration
                    ? await this.registrationRepository.resetForRetry(
                        existingRegistration._id.toString(),
                        {
                            ticketTypeId: new Types.ObjectId(iRegisterAttendanceDto.ticketTypeId),
                            status: "pending_payment",
                            paymentStatus: "unpaid",
                        },
                    )
                    : await this.registrationRepository.create({
                        _id: new Types.ObjectId(),
                        userId: new Types.ObjectId(attendeeId),
                        eventId: new Types.ObjectId(iRegisterAttendanceDto.eventId),
                        ticketTypeId: new Types.ObjectId(iRegisterAttendanceDto.ticketTypeId),
                        status: "pending_payment",
                        paymentStatus: "unpaid",
                        registeredAt: new Date(),
                    });

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
            const registration =
                existingRegistration
                    ? await this.registrationRepository.resetForRetry(
                        existingRegistration._id.toString(),
                        {
                            ticketTypeId: new Types.ObjectId(iRegisterAttendanceDto.ticketTypeId),
                            status: "confirmed",
                            paymentStatus: "free",
                        },
                    )
                    : await this.registrationRepository.create({
                        _id: new Types.ObjectId(),
                        userId: new Types.ObjectId(attendeeId),
                        eventId: new Types.ObjectId(iRegisterAttendanceDto.eventId),
                        ticketTypeId: new Types.ObjectId(iRegisterAttendanceDto.ticketTypeId),
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
        if (["pending_payment", "cancelled", "payment_failed"].includes(registration.status)) {
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
            throw new AppError("Đăng ký đã được xác nhận nhưng không tìm thấy vé.", 409);
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

    async issueTicketForRegistration(registrationId: string) {
        const existingTicket =
            await this.ticketRepository.findByRegistrationIdPlain(registrationId);
        if (existingTicket) return existingTicket;

        const registration = await this.registrationRepository.findById(registrationId);
        if (!registration) throw new AppError("Không tìm thấy thông tin đăng ký.", 404);
        if (registration.status === "cancelled" || registration.status === "payment_failed") {
            throw new AppError("Đăng ký này không đủ điều kiện để phát hành vé.", 400);
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

        const registration = await this.registrationRepository.findById(registrationId);
        if (!registration) throw new AppError("Không tìm thấy thông tin đăng ký.", 404);

        const [attendee, event] = await Promise.all([
            this.userRepository.findById(registration.userId.toString()),
            this.eventRepository.findById(registration.eventId.toString()),
        ]);

        if (!attendee) throw new AppError("Không tìm thấy thông tin người tham dự.", 404);
        if (!event) throw new AppError("Không tìm thấy thông tin sự kiện.", 404);

        const qrCode = await generateTicketQrCode({
            registrationId: registration._id.toString(),
            eventId: registration.eventId.toString(),
            timestamp: Date.now(),
        });

        const ticket = await this.ticketRepository.create({
            registrationId: registration._id,
            attendeeId: registration.userId,
            eventId: registration.eventId,
            ticketTypeId: registration.ticketTypeId,
            qrCode,
            status: "ISSUED",
            issuedAt: new Date(),
            expiredAt: event.endDate,
        });

        await this.eventRepository.updateByAttendeeCount(registration.eventId.toString());

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

        return ticket;
    }
}
