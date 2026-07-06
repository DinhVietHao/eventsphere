import { AppError } from "../../shared/errors/AppError";
import { emailService } from "../../shared/services/email.service";
import { qrService } from "../../shared/services/qr.service";
import { IRegisterAttendanceDto } from "./dto/registration.dto";
import { RegistrationRepository } from "./repositories/registration.repository";
import { TicketRepository } from "./repositories/ticket.repository";
import { TicketTypeRepository } from "../events/repositories/ticketType.repository";
import { UserRepository } from "../auth/repositories/user.repository";
import { EventRepository } from "../events/repositories/event.repository";
import { Types } from "mongoose";

export class TicketsService {
    private registrationRepository: RegistrationRepository;
    private ticketRepository: TicketRepository;
    private ticketTypeRepository: TicketTypeRepository;
    private userRepository: UserRepository;
    private eventRepository: EventRepository;

    constructor() {
        this.registrationRepository = new RegistrationRepository();
        this.ticketRepository = new TicketRepository();
        this.ticketTypeRepository = new TicketTypeRepository();
        this.userRepository = new UserRepository();
        this.eventRepository = new EventRepository();
    }

    async registerAttendance(
        attendeeId: string,
        iRegisterAttendanceDto: IRegisterAttendanceDto,
    ) {
        let isReserved = false;
        try {
            const attendee = await this.userRepository.findById(attendeeId);
            if (!attendee) {
                throw new AppError("Attendee not found", 404);
            }

            const event = await this.eventRepository.findById(iRegisterAttendanceDto.eventId);
            if (!event) {
                throw new AppError("Event not found", 404);
            }
            if (!["APPROVED", "ONGOING"].includes(event.status)) {
                throw new AppError("Invalid event status", 400);
            }
            const ticketType = await this.ticketTypeRepository.findByEventAndTicketType(
                iRegisterAttendanceDto.eventId,
                iRegisterAttendanceDto.ticketTypeId

            )

            if (!ticketType) {
                throw new AppError("Ticket type not found", 404);
            }

            const existingRegistration =
                await this.registrationRepository.findActiveByAttendeeAndEvent(
                    attendeeId,
                    iRegisterAttendanceDto.eventId,

                );
            if (existingRegistration) {
                throw new AppError("Already registered", 409);
            }

            const reservedTicketType = await this.ticketTypeRepository.reserveTicket(
                iRegisterAttendanceDto.ticketTypeId,
                iRegisterAttendanceDto.eventId
            );

            if (!reservedTicketType) {
                throw new AppError("Ticket sold out", 400);
            }

            isReserved = true;

            const isFreeTicket = reservedTicketType.price === 0;

            const registration = await this.registrationRepository.create({
                _id: new Types.ObjectId(),
                userId: new Types.ObjectId(attendeeId),
                eventId: new Types.ObjectId(iRegisterAttendanceDto.eventId),
                ticketTypeId: new Types.ObjectId(iRegisterAttendanceDto.ticketTypeId),
                status: isFreeTicket ? "confirmed" : "pending_payment",
                paymentStatus: isFreeTicket ? "free" : "unpaid",
                registeredAt: new Date()
            });

            if (isFreeTicket) {
                const qrCode = await qrService.generateTicketQrCode({
                    registrationId: registration._id.toString(),
                    eventId: iRegisterAttendanceDto.eventId,
                    timestamp: Date.now(),
                });

                const ticket = await this.ticketRepository.create(
                    {
                        registrationId: new Types.ObjectId(registration._id),
                        attendeeId: new Types.ObjectId(attendeeId),
                        eventId: new Types.ObjectId(iRegisterAttendanceDto.eventId),
                        ticketTypeId: new Types.ObjectId(iRegisterAttendanceDto.ticketTypeId),
                        qrCode,
                        status: "ISSUED",
                        issuedAt: new Date(),
                        expiredAt: event.endDate,
                    }
                );

                await this.eventRepository.updateByAttendeeCount(
                    iRegisterAttendanceDto.eventId
                );

                try {
                    await emailService.sendTicketEmail({
                        to: attendee.email,
                        attendeeName: attendee.name,
                        eventTitle: event.title,
                        ticketTypeName: reservedTicketType.name,
                        qrCode,
                    });
                } catch (mailError) {
                    console.error("Send ticket email failed:", mailError);
                }

                return {
                    registration,
                    ticket,
                    nextStep: "ticket_issued",
                };
            }

            return {
                registration,
                ticket: null,
                nextStep: "payment_required",
                payment: {
                    amount: reservedTicketType.price,
                    currency: "VND",
                    useCase: "UC08 Payment",
                },
            };
        } catch (error) {
            if (isReserved) {
                await this.ticketTypeRepository.decreaseSold(
                    iRegisterAttendanceDto.ticketTypeId
                );
            }
            console.error("Error in registerAttendance:", error);
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError("Registration failed", 500);
        }
    }
}
