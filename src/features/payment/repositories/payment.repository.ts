import { Types } from "mongoose";
import { Payment } from "../model/payment.model";
import type { IPayment } from "../model/payment.model";

export class PaymentRepository {
  async create(data: Partial<IPayment>) {
    return Payment.create(data);
  }

  async getOrderCode(orderCode: string) {
    return Payment.findOne({ orderCode });
  }

  async findByRegistrationId(registrationId: string) {
    return Payment.findOne({
      registrationId: new Types.ObjectId(registrationId),
    }).sort({ createdAt: -1 });
  }

  async markPaid(
    orderCode: string,
    data: {
      gatewayTransactionNo?: string;
      rawIpnData?: Record<string, unknown>;
    },
  ) {
    return Payment.findOneAndUpdate(
      { orderCode, status: { $ne: "paid" } },
      {
        status: "paid",
        gatewayTransactionNo: data.gatewayTransactionNo,
        rawIpnData: data.rawIpnData,
        paidAt: new Date(),
      },
      { returnDocument: "after" },
    );
  }

  async markFailed(orderCode: string, rawIpnData?: Record<string, unknown>) {
    return Payment.findOneAndUpdate(
      { orderCode, status: "pending" },
      {
        status: "failed",
        rawIpnData,
        failedAt: new Date(),
      },
      { returnDocument: "after" },
    );
  }

  async cancelPendingByRegistration(registrationId: Types.ObjectId) {
    return Payment.updateMany(
      {
        registrationId,
        status: "pending",
      },
      {
        status: "failed",
        failedAt: new Date(),
      },
    );
  }
}
