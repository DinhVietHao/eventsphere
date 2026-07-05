import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleMiddleware } from '../../shared/middlewares/role.middleware';
import { TicketsController } from './tickets.controller';

const ticketsRouter = Router();
const ticketsController = new TicketsController();

ticketsRouter.post('/register', authMiddleware, roleMiddleware('attendee'), ticketsController.registerAttendance);
ticketsRouter.get('/:id', authMiddleware, roleMiddleware('attendee'), ticketsController.viewTicketDetail);
ticketsRouter.post('/:id/calendar', (req, res) => res.json({ message: 'UC10 - Add to Google Calendar (OAuth2)' }));
ticketsRouter.get('/history/me', (req, res) => res.json({ message: 'UC12 - View attendance history' }));

export default ticketsRouter;
