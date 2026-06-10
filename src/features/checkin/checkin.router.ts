import { Router } from 'express';

const checkinRouter = Router();

// Yêu cầu role 'staff' hoặc 'organizer'
checkinRouter.post('/confirm', (req, res) => res.json({ message: 'UC21 - Confirm check-in (Scan QR, phát Socket.io, chặn Race Condition)' }));
checkinRouter.get('/attendees', (req, res) => res.json({ message: 'UC22 - Search attendee (Check-in thủ công khi mã lỗi)' }));

export default checkinRouter;