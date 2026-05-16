import { Request, Response } from 'express';
import { HistoryService } from '../services/history.service';

const historyService = new HistoryService();

export class HistoryController {
  async list(req: Request, res: Response): Promise<void> {
    const { applicationId, action, status, limit, page } = req.query;
    const result = await historyService.list({
      applicationId: typeof applicationId === 'string' ? applicationId : undefined,
      action: typeof action === 'string' ? (action as any) : undefined,
      status: typeof status === 'string' ? (status as any) : undefined,
      limit: typeof limit === 'string' ? Number(limit) : undefined,
      page: typeof page === 'string' ? Number(page) : undefined
    });
    res.json({
      success: true,
      history: result.items,
      total: result.total,
      page: result.page,
      pages: result.pages
    });
  }
}
