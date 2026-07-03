import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";

let io: SocketServer;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] connected: ${socket.id}`);

    // Organizer join room của event để nhận realtime update
    // Client gọi: socket.emit('join_event', '<eventId>')
    socket.on("join_event", (eventId: string) => {
      socket.join(eventId);
      console.log(`[Socket] ${socket.id} joined room: ${eventId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Lấy instance Socket.io để emit event từ bất kỳ file nào.
 *
 * Cách Trọng dùng trong UC-21 sau khi check-in thành công:
 *
 *   import { getIO } from '../../config/socket';
 *
 *   getIO().to(eventId).emit('checkin_update', {
 *     totalCheckedIn : <số mới>,
 *     attendanceRate : <% mới>,
 *     lastCheckedIn  : { name, email, checkedAt: new Date() },
 *   });
 */
export const getIO = (): SocketServer => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo");
  return io;
};
