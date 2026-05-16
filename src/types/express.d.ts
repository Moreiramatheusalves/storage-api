import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        id: string;
        username: string;
      };
      application?: {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
      };
    }
  }
}

export {};
