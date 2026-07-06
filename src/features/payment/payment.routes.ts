import { Router } from "express";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { roleMiddleware } from "../../shared/middlewares/role.middleware";
import { PaymentController } from "./payment.controller";

const paymentRoutes = Router();
const paymentController = new PaymentController();

paymentRoutes.post("/vnpay/create", authMiddleware, roleMiddleware("attendee"), paymentController.createVNPayPaymentUrl);
paymentRoutes.get("/vnpay/return", paymentController.vnpayReturn);
paymentRoutes.get("/vnpay/ipn", paymentController.vnpayIpn);

export default paymentRoutes;
