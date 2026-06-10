import { Router } from 'express';

const adminRouter = Router();

adminRouter.patch('/events/:id/approve', (req, res) => res.json({ message: 'UC23 - Approve event' }));
adminRouter.put('/accounts/:id', (req, res) => res.json({ message: 'UC24 - Manage accounts (Ban/Unban/Role)' }));
adminRouter.get('/dashboard', (req, res) => res.json({ message: 'UC25 - View system dashboard (MongoDB Aggregation)' }));
adminRouter.get('/reports/revenue', (req, res) => res.json({ message: 'UC26 - View revenue report' }));

export default adminRouter;