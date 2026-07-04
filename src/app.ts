import path from "path";
import express from "express";
import flash from "connect-flash";
import session from "express-session";
import cookieParser from "cookie-parser";
import viewsRouter from "./routes/views.router";
import notificationRouter from "./features/notifications/notification.router";
import authRouter from "./features/auth/auth.router";
import eventsRouter from "./features/events/events.router";
import { errorHandler } from "./shared/errors/errorHandler";
import ticketsRouter from "./features/tickets/tickets.router";
import checkinRouter from "./features/checkin/checkin.router";
import registrationRouter from "./features/tickets/registration.router";

const ejsLayouts = require("express-ejs-layouts");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Config Session + Flash
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "eventsphere-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(flash());

// Config EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(ejsLayouts);
app.set("layout", "layouts/main");

// View routes
app.use("/", viewsRouter);

// API routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/events", eventsRouter);
app.use("/api/v1/registrations", registrationRouter);
app.use("/api/v1/tickets", ticketsRouter);
app.use("/api/v1/checkin", checkinRouter);
app.use("/api/v1/notifications", notificationRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
