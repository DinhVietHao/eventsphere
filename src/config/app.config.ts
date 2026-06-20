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
};
