import { Router } from 'express';

const ticketsRouter = Router();

// Toàn bộ UCs yêu cầu đăng nhập với quyền 'attendee'
ticketsRouter.post('/register', (req, res) => res.json({ message: 'UC07 - Register attendance (Kiểm tra Quota)' }));
ticketsRouter.post('/pay', (req, res) => res.json({ message: 'UC08 - Pay for ticket (Tích hợp Webhook)' }));
ticketsRouter.get('/:id', (req, res) => res.json({ message: 'UC09 - View ticket details (Hiển thị UUID QR)' }));
ticketsRouter.post('/:id/calendar', (req, res) => res.json({ message: 'UC10 - Add to Google Calendar (OAuth2)' }));
ticketsRouter.get('/history/me', (req, res) => res.json({ message: 'UC12 - View attendance history' }));

export default ticketsRouter;