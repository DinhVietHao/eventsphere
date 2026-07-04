import { Types } from "mongoose";
import { ITicketType, TicketType } from "../models/ticketType.model";

export class TicketTypeRepository {
    async findByEventAndTicketType(
        eventId: string,
        ticketTypeId: string
    ): Promise<ITicketType | null> {
        return TicketType.findOne({
            _id: new Types.ObjectId(ticketTypeId),
            eventId: new Types.ObjectId(eventId),
        });
    }

    async reserveTicket(
        ticketTypeId: string,
        eventId: string
    ): Promise<ITicketType | null> {
        return TicketType.findOneAndUpdate(
            {
                _id: new Types.ObjectId(ticketTypeId),
                eventId: new Types.ObjectId(eventId),
                $expr: {
                    $lt: ["$sold", "$quota"],
                },
            },
            {
                $inc: { sold: 1 },
            },
            {
                returnDocument: "after",
            }
        );
    }

    async decreaseSold(ticketTypeId: string): Promise<void> {
        await TicketType.updateOne(
            {
                _id: new Types.ObjectId(ticketTypeId),
                sold: { $gt: 0 },
            },
            {
                $inc: { sold: -1 },
            }
        );
    }
}