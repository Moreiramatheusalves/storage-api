import { Request, Response } from 'express';
import { AdminAuthService } from '../services/admin-auth.service';

const authService = new AdminAuthService();

export class AdminAuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username e password são obrigatórios.' });
      return;
    }

    const user = await authService.validateCredentials(username, password);
    if (!user) {
      res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
      return;
    }

    const token = authService.signJwt(user);

    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ success: true, message: 'Login realizado com sucesso.' });
  }

  logout(_req: Request, res: Response): void {
    res.clearCookie('adminToken', { path: '/' });
    res.json({ success: true, message: 'Logout realizado.' });
  }
}
