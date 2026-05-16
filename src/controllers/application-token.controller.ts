import { Request, Response } from 'express';
import { ApplicationTokenService } from '../services/application-token.service';

const applicationTokenService = new ApplicationTokenService();

export class ApplicationTokenController {
  async list(_req: Request, res: Response): Promise<void> {
    const applications = await applicationTokenService.listApplications();
    res.json({ success: true, applications });
  }

  async create(req: Request, res: Response): Promise<void> {
    const { name } = req.body as { name?: string };

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: 'Nome da aplicação é obrigatório.' });
      return;
    }

    const result = await applicationTokenService.createApplication(name.trim());
    res.status(201).json({ success: true, ...result });
  }

  async rotateToken(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const token = await applicationTokenService.rotateToken(id);

      return res.status(200).json({
        success: true,
        token
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Erro ao rotacionar token"
      });
    }
  }

  async setActive(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const { active } = req.body as { active?: any };
    if (typeof active !== 'boolean') {
      res.status(400).json({ success: false, message: 'Campo active deve ser booleano.' });
      return;
    }
    try {
      await applicationTokenService.setActive(id, active);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || 'Aplicação não encontrada.' });
    }
  }
}
