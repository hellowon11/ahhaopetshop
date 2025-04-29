import { Request } from 'express';
import { User } from '../models/User';

declare module 'express' {
  interface Request {
    user?: {
      id: string;
    };
  }
} 