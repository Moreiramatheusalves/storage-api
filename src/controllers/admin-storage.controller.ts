import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Request, Response } from 'express';
import { AdminStorageService } from '../services/admin-storage.service';
import { asyncHandler } from '../utils/async-handler';

export class AdminStorageController {
  private readonly service: AdminStorageService;

  constructor(service: AdminStorageService = new AdminStorageService()) {
    this.service = service;
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const relativePath = String(req.query.path ?? '').trim();
    const listing = await this.service.listDetailed(relativePath);
    const stats = await this.service.stats(relativePath);

    res.json({
      success: true,
      items: listing.items,
      entries: listing.entries,
      stats
    });
  });

  read = asyncHandler(async (req: Request, res: Response) => {
    const relativePath = String(req.query.path ?? '').trim();
    const payload = await this.service.getReadPayload(relativePath);

    res.setHeader('Content-Type', payload.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Length', String(payload.sizeBytes));
    res.setHeader('Content-Disposition', `inline; filename="${payload.fileName}"`);

    await pipeline(fs.createReadStream(payload.absolutePath), res);
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const relativePath = String(req.query.path ?? '').trim();
    const recursive = String(req.query.recursive ?? '').toLowerCase() === 'true';

    const result = await this.service.delete({
      relativePath,
      recursive,
      adminUsername: req.adminUser?.username,
      requestIp: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });

    res.json({
      success: true,
      message:
        result.type === 'directory' && result.recursive
          ? 'Diretório e conteúdo removidos com sucesso.'
          : 'Arquivo ou diretório removido com sucesso.',
      result
    });
  });
}