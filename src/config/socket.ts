import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";

let io: SocketServer;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] connected: ${socket.id}`);

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

export const getIO = (): SocketServer => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo");
  return io;
};
