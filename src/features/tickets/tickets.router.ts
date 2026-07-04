import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleMiddleware } from '../../shared/middlewares/role.middleware';
import { TicketsController } from './tickets.controller';

const ticketsRouter = Router();
const ticketsController = new TicketsController();

ticketsRouter.post('/register', authMiddleware, roleMiddleware('attendee'), ticketsController.registerAttendance);

// Toàn bộ UCs yêu cầu đăng nhập với quyền 'attendee'
ticketsRouter.post('/pay', (req, res) => res.json({ message: 'UC08 - Pay for ticket (Tích hợp Webhook)' }));
ticketsRouter.get('/:id', (req, res) => res.json({ message: 'UC09 - View ticket details (Hiển thị UUID QR)' }));
ticketsRouter.post('/:id/calendar', (req, res) => res.json({ message: 'UC10 - Add to Google Calendar (OAuth2)' }));
ticketsRouter.get('/history/me', (req, res) => res.json({ message: 'UC12 - View attendance history' }));

export default ticketsRouter;
