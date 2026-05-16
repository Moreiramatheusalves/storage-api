import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/app.error';
import { StorageManagerService } from '../services/storage-manager.service';

const storageManagerService = new StorageManagerService();

async function safeUnlink(filePath?: string): Promise<void> {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[TMP_CLEANUP_ERROR]', error);
    }
  }
}

export class StorageController {
  private requireApplication(req: Request) {
    if (!req.application) {
      throw new AppError('AplicaÃ§Ã£o nÃ£o autenticada.', 401);
    }

    return req.application;
  }

  private requireString(value: unknown, fieldName: string): string {
    const parsed = String(value ?? '').trim();

    if (!parsed) {
      throw new AppError(`Campo ${fieldName} Ã© obrigatÃ³rio.`, 400);
    }

    return parsed;
  }

  private normalizeError(error: unknown): { statusCode: number; message: string } {
    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        message: error.message
      };
    }

    if (error instanceof Error) {
      const message = error.message || 'Erro interno do servidor.';

      if (/obrigat[oÃ³]rio|inv[aÃ¡]lid|n[aÃ£]o permitido|unsupported|tipo/i.test(message)) {
        return { statusCode: 400, message };
      }

      if (/n[aÃ£]o encontrado|not found|inexistente/i.test(message)) {
        return { statusCode: 404, message };
      }

      if (/n[aÃ£]o autenticad|unauthorized|token/i.test(message)) {
        return { statusCode: 401, message };
      }

      return {
        statusCode: 500,
        message
      };
    }

    return {
      statusCode: 500,
      message: 'Erro interno do servidor.'
    };
  }

  async upload(req: Request, res: Response): Promise<void> {
    const application = this.requireApplication(req);
    const { path: dirPath, filename } = req.body as { path?: string; filename?: string };
    const file = req.file;

    try {
      const directoryPath = this.requireString(dirPath, 'path');

      if (!file?.buffer && !file?.path) {
        throw new AppError('Arquivo é obrigatório.', 400);
      }

      const finalFileName = String(filename || file.originalname || '').trim();
      if (!finalFileName) {
        throw new AppError('Nome do arquivo é obrigatório.', 400);
      }

      let buffer: Buffer;
      if (file.buffer) {
        buffer = file.buffer;
      } else {
        buffer = await fs.promises.readFile(file.path);
      }

      const result = await storageManagerService.upload(
        application,
        directoryPath,
        finalFileName,
        buffer,
        { ip: req.ip, userAgent: req.get('user-agent') ?? undefined }
      );

      res.status(201).json({
        success: true,
        applicationId: application.id,
        relativePath: result.relativePath,
        sizeBytes: result.sizeBytes,
        mimeType: result.mimeType,
        fileUrl: `${env.baseUrl}/api/files/read?path=${encodeURIComponent(result.relativePath)}`
      });
    } finally {
      await safeUnlink(file?.path);
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const application = this.requireApplication(req);
    const relativePath = this.requireString(req.query.path, 'path');
    const items = await storageManagerService.list(
      application,
      relativePath,
      { ip: req.ip, userAgent: req.get('user-agent') ?? undefined }
    );
    res.json({ success: true, items });
  }

  async read(req: Request, res: Response): Promise<void> {
    const application = this.requireApplication(req);
    const relativePath = this.requireString(req.query.path, 'path');
    const payload = await storageManagerService.getReadPayload(
      application,
      relativePath,
      { ip: req.ip, userAgent: req.get('user-agent') ?? undefined }
    );
    res.setHeader('Content-Type', payload.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Length', String(payload.sizeBytes));
    res.setHeader('Content-Disposition', `inline; filename="${payload.fileName}"`);
    await pipeline(fs.createReadStream(payload.absolutePath), res);
  }

  async remove(req: Request, res: Response): Promise<void> {
    const application = this.requireApplication(req);
    const relativePath = this.requireString(req.query.path, 'path');
    await storageManagerService.delete(
      application,
      relativePath,
      { ip: req.ip, userAgent: req.get('user-agent') ?? undefined }
    );
    res.json({ success: true, message: 'Arquivo removido.' });
  }
}

