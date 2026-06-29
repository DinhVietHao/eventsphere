import path from "path";
import express from "express";
import viewsRouter from "./routes/views.router";
import authRouter from "./features/auth/auth.router";
import eventsRouter from "./features/events/events.router";
import { errorHandler } from "./shared/errors/errorHandler";
import ticketsRouter from "./features/tickets/tickets.router";
import checkinRouter from "./features/checkin/checkin.router";

const ejsLayouts = require("express-ejs-layouts");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use("/api/v1/tickets", ticketsRouter);
app.use("/api/v1/checkin", checkinRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
