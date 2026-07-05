import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

export const appConfig = {
  port: parseInt(process.env.PORT ?? "5000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/eventsphere",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret",
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? "7d",
  },
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  },
  email: {
    host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT ?? "587", 10),
    user: process.env.EMAIL_USER ?? "",
    password: process.env.EMAIL_PASSWORD ?? "",
    from: process.env.EMAIL_FROM ?? "noreply@eventsphere.com",
  },
  vnpay: {
    tmnCode: process.env.VNP_TMN_CODE ?? "",
    hashSecret: process.env.VNP_HASH_SECRET ?? "",
    paymentUrl:
      process.env.VNP_URL ??
      "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    returnUrl:
      process.env.VNP_RETURN_URL ??
      "http://localhost:5000/api/v1/payments/vnpay/return",
    apiUrl:
      process.env.VNP_API ??
      "http://sandbox.vnpayment.vn/merchant_webapi/merchant.html",
  },
};
