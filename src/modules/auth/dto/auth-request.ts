import { type Request } from 'express';

interface AuthUser {
  user: {
    sub: string;
    id: string;
    email: string;
    role: string;
  };
}

export type AuthRequest = Request & AuthUser;
