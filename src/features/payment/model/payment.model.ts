import { Schema, model, Types, Document } from "mongoose";

export interface IPayment extends Document {
    registrationId: Types.ObjectId;
    attendeeId: Types.ObjectId;
    eventId: Types.ObjectId;
    ticketTypeId: Types.ObjectId;
    amount: number;
    orderCode: string;
    status: "pending" | "paid" | "failed";
    provider: "vnpay";
    paymentUrl?: string;
    gatewayTransactionNo?: string;
    rawIpnData?: Record<string, unknown>;
    paidAt?: Date;
    failedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
    {
        registrationId: { type: Schema.Types.ObjectId, ref: "Registration", required: true },
        attendeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
        ticketTypeId: { type: Schema.Types.ObjectId, ref: "TicketType", required: true },
        amount: { type: Number, required: true },
        orderCode: { type: String, required: true, unique: true },
        status: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        provider: { type: String, enum: ["vnpay"], default: "vnpay" },
        paymentUrl: String,
        gatewayTransactionNo: String,
        rawIpnData: Schema.Types.Mixed,
        paidAt: Date,
        failedAt: Date,
    },
    { timestamps: true },
);

PaymentSchema.index({ orderCode: 1 }, { name: "idx_payments_orderCode", unique: true });

export const Payment = model<IPayment>("Payment", PaymentSchema);
