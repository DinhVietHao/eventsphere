import express from "express";
import { errorHandler } from "./shared/errors/errorHandler";
import authRouter from "./features/auth/auth.router";
import eventsRouter from "./features/events/events.router";
import ticketsRouter from "./features/tickets/tickets.router";
import checkinRouter from "./features/checkin/checkin.router";
import notificationRouter from "./features/notifications/notification.router";

const app = express();

app.use(express.json());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/events", eventsRouter);
app.use("/api/v1/tickets", ticketsRouter);
app.use("/api/v1/checkin", checkinRouter);
app.use("/api/v1/notifications", notificationRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
