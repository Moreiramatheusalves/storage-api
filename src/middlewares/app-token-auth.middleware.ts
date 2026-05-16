import { NextFunction, Request, Response } from 'express';
import { ApplicationTokenService } from '../services/application-token.service';

const applicationTokenService = new ApplicationTokenService();

export async function applicationTokenAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.header('X-Storage-Token');

  if (!token) {
    res.status(401).json({ success: false, message: 'Header X-Storage-Token é obrigatório.' });
    return;
  }

  const application = await applicationTokenService.validateToken(token);
  if (!application) {
    res.status(401).json({ success: false, message: 'Token inválido.' });
    return;
  }

  req.application = application;
  next();
}
