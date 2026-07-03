import app from "./app";
import mongoose from "mongoose";
import { appConfig } from "./config/app.config";

const PORT = appConfig.port;

mongoose
  .connect(appConfig.mongoUri)
  .then(() => {
    console.log("🍃 MongoDB đã kết nối thành công");
    app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`🚀 EventSphere Backend Server đang chạy!`);
      console.log(`📡 Cổng kết nối (Port): ${PORT}`);
      console.log(`🌍 Môi trường (Environment): ${appConfig.nodeEnv}`);
      console.log(`=========================================`);
    });
  })
  .catch((err) => {
    console.error("💥 Kết nối MongoDB thất bại:", err.message);
    process.exit(1);
  });

process.on("unhandledRejection", (err: Error) => {
  console.error(`💥 Lỗi nghiêm trọng Unhandled Rejection: ${err.message}`);
  process.exit(1);
});
