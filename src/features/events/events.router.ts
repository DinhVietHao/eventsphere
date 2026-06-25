import { Router } from 'express';
import { EventController } from './events.controller';

const eventsRouter = Router();
const eventController = new EventController();

// Guest UCs
eventsRouter.get('/', eventController.getPublishedEvents);
eventsRouter.get('/search', eventController.searchEvents);
eventsRouter.get('/:id', eventController.getEventById);

// Organizer UCs (Cần authMiddleware & roleMiddleware('organizer'))
eventsRouter.post('/', (req, res) => res.json({ message: 'UC13 - Create event & UC14 - Manage ticket types' }));
eventsRouter.put('/:id', (req, res) => res.json({ message: 'UC13 - Update event' }));
eventsRouter.get('/:id/registrations', (req, res) => res.json({ message: 'UC15 - View registration list' }));
eventsRouter.get('/:id/export', (req, res) => res.json({ message: 'UC18 - Export attendee CSV' }));
eventsRouter.get('/:id/report', (req, res) => res.json({ message: 'UC19 - View event report' }));
eventsRouter.get('/:id/dashboard', (req, res) => res.json({ message: 'UC20 - View realtime dashboard (Socket.io)' }));

export default eventsRouter;