import { TicketModel } from "../models/ticket.model";
import { ITicket } from "../types/ticket.type";


export class TicketRepository {
  // Tao ticket QR sau khi registration mien phi duoc confirm.
  async create(
    data: ITicket
  ) {
    const ticket = new TicketModel(data);
    const savedTicket = await ticket.save();
    return savedTicket;
  }
}
