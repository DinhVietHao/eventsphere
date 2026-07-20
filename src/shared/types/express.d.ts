declare namespace Express {
  interface Request {
    user?: {
      id: string;
      name: string;
      role: "attendee" | "organizer" | "staff" | "admin";
      avatar?: string;
    };
  }
}
