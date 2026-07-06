import { Router } from "express";
import { Request, Response } from "express";
import { TicketsService } from "../features/tickets/tickets.service";

const ticketsViewsRouter = Router();
const ticketsService = new TicketsService();

//UC09 - View ticket detail
ticketsViewsRouter.get("/tickets/:id", async (req: Request, res: Response) => {
    try {
        const ticketId = req.params.id as string;
        const attendeeId = req.user!.id;
        const ticket = await ticketsService.getTicketDetail(ticketId, attendeeId);
        res.render("tickets/detail", {
            ticket,
            user: req.user || null,
            messages: req.flash?.() || {},
        });
    } catch (error) {
        res.status(500).send("Server error");
    }
});

export default ticketsViewsRouter;
