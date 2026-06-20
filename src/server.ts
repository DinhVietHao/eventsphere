// import app from './app';
// import mongoose  from 'mongoose';
// import { appConfig } from './config/app.config';

// const PORT = appConfig.port;

// const server = app.listen(PORT, () => {
//   console.log(`=========================================`);
//   console.log(`🚀 EventSphere Backend Server đang chạy!`);
//   console.log(`📡 Cổng kết nối (Port): ${PORT}`);
//   console.log(`🌍 Môi trường (Environment): ${appConfig.nodeEnv}`);
//   console.log(`=========================================`);
// });

// // Xử lý lỗi hệ thống khi có Promise bị reject mà không có catch
// process.on('unhandledRejection', (err: Error) => {
//   console.error(`💥 Lỗi nghiêm trọng Unhandled Rejection: ${err.message}`);
//   // Đóng server gọn gàng trước khi crash
//   server.close(() => {
//     process.exit(1);
//   });
// });

import app from "./app";
import mongoose from "mongoose";
import { appConfig } from "./config/app.config";

const PORT = appConfig.port;

async function bootstrap() {
  // Kết nối MongoDB trước khi mở cổng
  await mongoose.connect(appConfig.mongoUri);
  console.log("🍃 MongoDB đã kết nối");

  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("💥 Khởi động thất bại:", err);
  process.exit(1);
});
