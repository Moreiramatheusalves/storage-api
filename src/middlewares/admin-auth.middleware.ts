import { NextFunction, Request, Response } from 'express';
import { AdminAuthService } from '../services/admin-auth.service';

const authService = new AdminAuthService();

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.adminToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'Não autenticado.' });
      return;
    }

    req.adminUser = authService.verifyJwt(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Sessão inválida ou expirada.' });
  }
}
