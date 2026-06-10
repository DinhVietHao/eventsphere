export interface IUserPayload {
  _id: string;
  email: string;
  role: 'attendee' | 'organizer' | 'staff' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: IUserPayload;
    }
  }
}