export interface IAuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'attendee' | 'organizer' | 'staff' | 'admin';
  };
  accessToken: string;
  refreshToken: string;
}