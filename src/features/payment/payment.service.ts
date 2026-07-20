import moment from "moment";
import { Types } from "mongoose";
import { appConfig } from "../../config/app.config";
import { AppError } from "../../shared/errors/AppError";
import {
    createVNPaySecureHash,
    buildVNPayQuery,
    verifyVNPaySecureHash,
} from "../../shared/utils/vnpay.util";
import { PaymentRepository } from "./repositories/payment.repository";
import { RegistrationRepository } from "../tickets/repositories/registration.repository";
import { TicketRepository } from "../tickets/repositories/ticket.repository";
import {
    EVENT_REGISTRATION_CLOSED_MESSAGE,
    TicketsService,
} from "../tickets/tickets.service";
import { TicketTypeRepository } from "../events/repositories/ticketType.repository";
import { EventRepository } from "../events/repositories/event.repository";

export class PaymentService {
    private paymentRepository: PaymentRepository;
    private registrationRepository: RegistrationRepository;
    private ticketRepository: TicketRepository;
    private ticketTypeRepository: TicketTypeRepository;
    private eventRepository: EventRepository;
    private ticketsService: TicketsService;

    constructor() {
        this.paymentRepository = new PaymentRepository();
        this.registrationRepository = new RegistrationRepository();
        this.ticketRepository = new TicketRepository();
        this.ticketTypeRepository = new TicketTypeRepository();
        this.eventRepository = new EventRepository();
        this.ticketsService = new TicketsService();
    }

    async createVNPayPaymentUrl(params: {
        attendeeId: string;
        registrationId: string;
        bankCode?: string;
        language?: string;
        ipAddr: string;
    }) {
        process.env.TZ = "Asia/Ho_Chi_Minh";

        const { attendeeId, registrationId, bankCode, language } = params;
        const normalizedIpAddr =
            params.ipAddr === "::1" || params.ipAddr === "::ffff:127.0.0.1"
                ? "127.0.0.1"
                : params.ipAddr;

        if (!Types.ObjectId.isValid(registrationId)) {
            throw new AppError("Mã đăng ký tham dự không hợp lệ.", 400);
        }

        const tmnCode = appConfig.vnpay.tmnCode;
        const secretKey = appConfig.vnpay.hashSecret;
        let vnpUrl = appConfig.vnpay.paymentUrl;

        if (!tmnCode || !secretKey) {
            throw new AppError("Chưa cấu hình thông tin thanh toán VNPay.", 500);
        }

        const registration = await this.registrationRepository.findByIdAndAttendee(
            registrationId,
            attendeeId,
        );

        if (!registration) {
            throw new AppError("Không tìm thấy thông tin đăng ký.", 404);
        }

        if (registration.status !== "pending_payment") {
            throw new AppError("Đăng ký này không ở trạng thái chờ thanh toán.", 400);
        }

        if (registration.paymentStatus === "paid") {
            throw new AppError("Đăng ký này đã được thanh toán.", 409);
        }

        const event = await this.eventRepository.findById(registration.eventId.toString());
        if (!event) {
            throw new AppError("Không tìm thấy thông tin sự kiện.", 404);
        }
        if (event.status === "CANCELLED") {
            throw new AppError("Sự kiện đã bị hủy. Bạn không thể đăng ký hoặc mua vé.", 400);
        }
        if (event.status !== "APPROVED") {
            throw new AppError("Sự kiện hiện không cho phép đăng ký tham dự.", 400);
        }
        this.assertEventCanAcceptRegistration(event);

        const ticketType = await this.ticketTypeRepository.findByEventAndTicketType(
            registration.eventId.toString(),
            registration.ticketTypeId.toString(),
        );

        if (!ticketType) {
            throw new AppError("Không tìm thấy loại vé.", 404);
        }

        if (ticketType.price <= 0) {
            throw new AppError("Vé miễn phí không yêu cầu thanh toán.", 400);
        }

        const date = new Date();
        const createDate = moment(date).format("YYYYMMDDHHmmss");
        const orderCode = `${Date.now()}`;
        const locale = language && language !== "" ? language : "vn";

        const vnpParams: Record<string, string | number> = {
            vnp_Version: "2.1.0",
            vnp_Command: "pay",
            vnp_TmnCode: tmnCode,
            vnp_Locale: locale,
            vnp_CurrCode: "VND",
            vnp_TxnRef: orderCode,
            vnp_OrderInfo: `Thanh toan cho ma GD:${orderCode}`,
            vnp_OrderType: "other",
            vnp_Amount: Number(ticketType.price) * 100,
            vnp_ReturnUrl: appConfig.vnpay.returnUrl,
            vnp_IpAddr: normalizedIpAddr,
            vnp_CreateDate: createDate,
        };

        if (bankCode && bankCode !== "") {
            vnpParams.vnp_BankCode = bankCode;
        }

        vnpUrl += "?" + buildVNPayQuery(vnpParams);
        vnpUrl += `&vnp_SecureHash=${createVNPaySecureHash(vnpParams, secretKey)}`;

        await this.paymentRepository.cancelPendingByRegistration(registration._id);

        await this.paymentRepository.create({
            registrationId: registration._id,
            attendeeId: registration.userId,
            eventId: registration.eventId,
            ticketTypeId: registration.ticketTypeId,
            amount: ticketType.price,
            orderCode,
            status: "pending",
            provider: "vnpay",
            paymentUrl: vnpUrl,
        });

        await this.registrationRepository.updateRegistrationStatus(
            registration._id.toString(),
            "pending_payment",
            "pending",
            orderCode,
        );

        return {
            paymentUrl: vnpUrl,
            orderCode,
            amount: Number(ticketType.price),
            registrationId: registration._id,
        };
    }

    private assertEventCanAcceptRegistration(event: { startDate: Date }) {
        const eventStartAt = new Date(event.startDate);
        if (Number.isNaN(eventStartAt.getTime()) || new Date() >= eventStartAt) {
            throw new AppError(EVENT_REGISTRATION_CLOSED_MESSAGE, 400);
        }
    }

    async handleVNPayReturn(query: Record<string, string>) {
        const isValid = verifyVNPaySecureHash(query, appConfig.vnpay.hashSecret);

        if (!isValid) {
            return {
                success: false,
                checksumValid: false,
                orderCode: query.vnp_TxnRef,
                message: "Invalid VNPay checksum",
            };
        }

        const isPaid =
            query.vnp_ResponseCode === "00" &&
            query.vnp_TransactionStatus === "00";

        const payment = query.vnp_TxnRef
            ? await this.paymentRepository.getOrderCode(query.vnp_TxnRef)
            : null;
        const ticket = payment
            ? await this.ticketRepository.findByRegistrationIdPlain(
                payment.registrationId.toString(),
            )
            : null;

        const actualAmount = Number(query.vnp_Amount);
        const expectedAmount = Number(payment?.amount ?? 0) * 100;
        const amountValid = payment ? actualAmount === expectedAmount : false;
        const issuedTicket =
            isPaid && payment && amountValid
                ? await this.confirmSuccessfulPayment(query, payment)
                : ticket;

        if (isPaid && !amountValid) {
            return {
                success: false,
                checksumValid: true,
                orderCode: query.vnp_TxnRef,
                responseCode: query.vnp_ResponseCode,
                transactionStatus: query.vnp_TransactionStatus,
                message: "Payment amount is invalid",
            };
        }

        return {
            success: isPaid,
            checksumValid: true,
            orderCode: query.vnp_TxnRef,
            transactionNo: query.vnp_TransactionNo,
            responseCode: query.vnp_ResponseCode,
            transactionStatus: query.vnp_TransactionStatus,
            registrationId: payment?.registrationId?.toString(),
            eventId: payment?.eventId?.toString(),
            ticketId: issuedTicket?._id?.toString(),
            qrCode: issuedTicket?.qrCode,
            message: isPaid ? "Payment success" : "Payment failed",
        };
    }

    async handleVNPayIpn(query: Record<string, string>) {
        const isValid = verifyVNPaySecureHash(query, appConfig.vnpay.hashSecret);
        if (!isValid) {
            return { RspCode: "97", Message: "Invalid Checksum" };
        }

        const orderCode = query.vnp_TxnRef;
        const payment = await this.paymentRepository.getOrderCode(orderCode);
        if (!payment) {
            return { RspCode: "01", Message: "Order not found" };
        }

        if (payment.status === "paid") {
            return { RspCode: "02", Message: "Order already confirmed" };
        }

        const actualAmount = Number(query.vnp_Amount);
        const expectedAmount = Number(payment.amount) * 100;
        if (actualAmount !== expectedAmount) {
            await this.paymentRepository.markFailed(orderCode, query);
            await this.registrationRepository.updateRegistrationStatus(
                payment.registrationId.toString(),
                "cancelled",
                "unpaid",
                orderCode,
            );
            return { RspCode: "04", Message: "Invalid amount" };
        }

        const isPaid =
            query.vnp_ResponseCode === "00" &&
            query.vnp_TransactionStatus === "00";

        if (!isPaid) {
            await this.paymentRepository.markFailed(orderCode, query);
            await this.registrationRepository.updateRegistrationStatus(
                payment.registrationId.toString(),
                "cancelled",
                "unpaid",
                orderCode,
            );
            return { RspCode: "00", Message: "Confirm Success" };
        }

        try {
            await this.confirmSuccessfulPayment(query, payment);

            return { RspCode: "00", Message: "Confirm Success" };
        } catch (error) {
            await this.paymentRepository.markFailed(orderCode, query);
            await this.registrationRepository.updateRegistrationStatus(
                payment.registrationId.toString(),
                "cancelled",
                "unpaid",
                orderCode,
            );
            return { RspCode: "99", Message: "Confirm Failed" };
        }
    }

    private async confirmSuccessfulPayment(
        query: Record<string, string>,
        payment: Awaited<ReturnType<PaymentRepository["getOrderCode"]>>,
    ) {
        if (!payment) {
            throw new AppError("Payment not found", 404);
        }

        const existingTicket = await this.ticketRepository.findByRegistrationIdPlain(
            payment.registrationId.toString(),
        );

        const ticket =
            existingTicket ??
            await this.ticketsService.issueTicketForRegistration(
                payment.registrationId.toString(),
            );

        await this.registrationRepository.updateRegistrationStatus(
            payment.registrationId.toString(),
            "confirmed",
            "paid",
            query.vnp_TxnRef,
        );

        if (payment.status !== "paid") {
            await this.paymentRepository.markPaid(query.vnp_TxnRef, {
                gatewayTransactionNo: query.vnp_TransactionNo,
                rawIpnData: query,
            });
        }

        return ticket;
    }
}
