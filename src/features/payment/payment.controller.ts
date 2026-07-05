import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../shared/utils/response.util";
import { PaymentService } from "./payment.service";

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
    this.createVNPayPaymentUrl = this.createVNPayPaymentUrl.bind(this);
    this.vnpayReturn = this.vnpayReturn.bind(this);
    this.vnpayIpn = this.vnpayIpn.bind(this);
  }

  async createVNPayPaymentUrl(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const ipAddr =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.socket.remoteAddress ||
        "127.0.0.1";

      const result = await this.paymentService.createVNPayPaymentUrl({
        attendeeId: req.user!.id,
        registrationId: req.body.registrationId,
        bankCode: req.body.bankCode,
        language: req.body.language || "vn",
        ipAddr,
      });

      const accepts = req.get("accept") || "";
      const isJsonRequest =
        req.is("application/json") || accepts.includes("application/json");

      if (isJsonRequest) {
        return sendSuccess(res, result, "VNPay payment URL created successfully");
      }

      return res.redirect(result.paymentUrl);
    } catch (error) {
      next(error);
    }
  }

  async vnpayReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.paymentService.handleVNPayReturn(
        req.query as Record<string, string>,
      );

      return res.status(result.checksumValid === false ? 400 : 200).render(
        "payments/payment-result",
        {
          result,
          user: req.user || null,
          messages: req.flash ? req.flash() : {},
        },
      );
    } catch (error) {
      next(error);
    }
  }

  async vnpayIpn(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.paymentService.handleVNPayIpn(
        req.query as Record<string, string>,
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
