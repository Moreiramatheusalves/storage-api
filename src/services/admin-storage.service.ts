import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { AppError } from '../errors/app.error';
import { ensureAllowedFileType } from '../utils/file-signature.util';
import { HistoryService } from './history.service';
import { SqlStoreService } from './sql-store.service';

type AdminDeleteInput = {
  relativePath: string;
  recursive: boolean;
  adminUsername?: string;
  requestIp?: string;
  userAgent?: string;
};

type AdminDeleteResult = {
  relativePath: string;
  filename: string;
  type: 'file' | 'directory';
  recursive: boolean;
  removedEntries: number;
};

type StorageApplicationSummary = {
  id: string;
  name: string;
  isActive: number;
};

export type AdminStorageEntry = {
  name: string;
  displayName: string;
  path: string;
  type: 'file' | 'directory' | 'other';
  isDirectory: boolean;
  isFile: boolean;
  applicationId?: string;
  applicationName?: string;
  applicationIsActive?: boolean;
};

export class AdminStorageService {
  constructor(
    private readonly historyService = new HistoryService(),
    private readonly store = new SqlStoreService()
  ) { }

  private getRoot(): string {
    return path.resolve(env.appsStorageDir);
  }

  private isInsideOrSame(parent: string, child: string): boolean {
    const relative = path.relative(path.resolve(parent), path.resolve(child));

    return (
      relative === '' ||
      (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
    );
  }

  private normalizeAdminRelativePath(relativePath: string, options?: { allowRoot?: boolean }): string {
    const raw = String(relativePath || '').replace(/\\/g, '/').trim();

    if (!raw || raw === '/') {
      if (options?.allowRoot) {
        return '';
      }

      throw new AppError('Informe um caminho para excluir. A raiz do storage não pode ser removida.', 400);
    }

    const parts = raw.split('/').filter(Boolean);

    if (!parts.length) {
      if (options?.allowRoot) {
        return '';
      }

      throw new AppError('Informe um caminho válido para excluir.', 400);
    }

    for (const part of parts) {
      if (part === '.' || part === '..') {
        throw new AppError('Path traversal bloqueado.', 400);
      }

      if (!/^[a-zA-Z0-9._-]+$/.test(part)) {
        throw new AppError(`Segmento inválido no path: ${part}`, 400);
      }
    }

    return parts.join('/');
  }

  private resolveSafeAbsolutePath(relativePath: string, options?: { allowRoot?: boolean }): {
    safeRelativePath: string;
    absolutePath: string;
  } {
    const safeRelativePath = this.normalizeAdminRelativePath(relativePath, options);
    const root = this.getRoot();
    const absolutePath = path.resolve(root, safeRelativePath);

    if (!this.isInsideOrSame(root, absolutePath)) {
      throw new AppError('Caminho final inválido.', 400);
    }

    return {
      safeRelativePath,
      absolutePath
    };
  }

  private resolveDeletablePath(relativePath: string): {
    safeRelativePath: string;
    absolutePath: string;
  } {
    const resolved = this.resolveSafeAbsolutePath(relativePath, { allowRoot: false });
    const root = this.getRoot();

    if (resolved.absolutePath === root) {
      throw new AppError('Não é permitido remover a raiz do storage.', 403);
    }

    return resolved;
  }

  private getApplicationMap(): Map<string, StorageApplicationSummary> {
    const rows = this.store.all<StorageApplicationSummary>(
      'SELECT id, name, isActive FROM applications'
    );

    return new Map(rows.map((row) => [row.id, row]));
  }

  async list(relativePath: string): Promise<string[]> {
    const detailed = await this.listDetailed(relativePath);
    return detailed.items;
  }

  async listDetailed(relativePath: string): Promise<{
    items: string[];
    entries: AdminStorageEntry[];
  }> {
    const { safeRelativePath, absolutePath } = this.resolveSafeAbsolutePath(relativePath, { allowRoot: true });
    const entries = await fs.promises.readdir(absolutePath, { withFileTypes: true });
    const applications = this.getApplicationMap();
    const isRoot = safeRelativePath === '';

    const items = entries.map((entry) => `${entry.name}${entry.isDirectory() ? '/' : ''}`);

    const detailedEntries = entries.map((entry): AdminStorageEntry => {
      const entryPath = safeRelativePath ? `${safeRelativePath}/${entry.name}` : entry.name;
      const application = isRoot ? applications.get(entry.name) : undefined;
      const type = entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other';

      return {
        name: entry.name,
        displayName: application ? `${application.name} — ${entry.name}` : entry.name,
        path: entryPath,
        type,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        ...(application
          ? {
            applicationId: application.id,
            applicationName: application.name,
            applicationIsActive: !!application.isActive
          }
          : {})
      };
    });

    return {
      items,
      entries: detailedEntries
    };
  }

  async stats(relativePath: string): Promise<{ files: number; directories: number; types: Record<string, number> }> {
    const { absolutePath } = this.resolveSafeAbsolutePath(relativePath, { allowRoot: true });
    const entries = await fs.promises.readdir(absolutePath, { withFileTypes: true });

    let files = 0;
    let directories = 0;
    const types: Record<string, number> = {};

    for (const entry of entries) {
      if (entry.isDirectory()) {
        directories += 1;
      } else {
        files += 1;
        const ext = path.extname(entry.name).toLowerCase() || 'unknown';
        types[ext] = (types[ext] || 0) + 1;
      }
    }

    return { files, directories, types };
  }

  async getReadPayload(relativePath: string): Promise<{
    absolutePath: string;
    mimeType: string;
    fileName: string;
    sizeBytes: number;
  }> {
    const { absolutePath } = this.resolveSafeAbsolutePath(relativePath, { allowRoot: false });

    let stat: fs.Stats;

    try {
      stat = await fs.promises.stat(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AppError('Arquivo não encontrado.', 404);
      }

      throw error;
    }

    if (!stat.isFile()) {
      throw new AppError('Caminho não se refere a um arquivo.', 400);
    }

    const fileBuffer = await fs.promises.readFile(absolutePath);
    const mimeType = ensureAllowedFileType(fileBuffer);

    return {
      absolutePath,
      mimeType,
      fileName: path.basename(absolutePath),
      sizeBytes: stat.size
    };
  }

  async delete(input: AdminDeleteInput): Promise<AdminDeleteResult> {
    const startedAtPath = String(input.relativePath || '').trim();
    const filename = path.basename(startedAtPath.replace(/\\/g, '/'));

    try {
      const result = await this.deleteInternal(input);

      await this.recordAdminDelete({
        relativePath: result.relativePath,
        filename: result.filename,
        requestIp: input.requestIp,
        userAgent: input.userAgent,
        adminUsername: input.adminUsername,
        status: 'SUCCESS'
      });

      return result;
    } catch (error) {
      await this.recordAdminDelete({
        relativePath: startedAtPath,
        filename,
        requestIp: input.requestIp,
        userAgent: input.userAgent,
        adminUsername: input.adminUsername,
        status: 'ERROR'
      });

      throw error;
    }
  }

  private async deleteInternal(input: AdminDeleteInput): Promise<AdminDeleteResult> {
    const { safeRelativePath, absolutePath } = this.resolveDeletablePath(input.relativePath);

    let stat: fs.Stats;

    try {
      stat = await fs.promises.stat(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AppError('Arquivo ou diretório não encontrado.', 404);
      }

      throw error;
    }

    const filename = path.basename(absolutePath);

    if (!stat.isDirectory()) {
      await fs.promises.unlink(absolutePath);

      return {
        relativePath: safeRelativePath,
        filename,
        type: 'file',
        recursive: false,
        removedEntries: 1
      };
    }

    const entries = await fs.promises.readdir(absolutePath);

    if (entries.length > 0 && !input.recursive) {
      throw new AppError(
        'Diretório não está vazio. Confirme a exclusão recursiva para remover todos os arquivos e subdiretórios.',
        409,
        {
          requiresRecursive: true,
          entries: entries.length,
          path: safeRelativePath
        }
      );
    }

    if (entries.length > 0 && input.recursive) {
      await fs.promises.rm(absolutePath, {
        recursive: true,
        force: false
      });

      return {
        relativePath: safeRelativePath,
        filename,
        type: 'directory',
        recursive: true,
        removedEntries: entries.length
      };
    }

    await fs.promises.rmdir(absolutePath);

    return {
      relativePath: safeRelativePath,
      filename,
      type: 'directory',
      recursive: false,
      removedEntries: 0
    };
  }

  private async recordAdminDelete(input: {
    relativePath: string;
    filename: string;
    adminUsername?: string;
    requestIp?: string;
    userAgent?: string;
    status: 'SUCCESS' | 'ERROR';
  }): Promise<void> {
    try {
      await this.historyService.record({
        applicationId: 'ADMIN',
        applicationName: input.adminUsername ? `Admin: ${input.adminUsername}` : 'Admin',
        action: 'ADMIN_DELETE',
        relativePath: input.relativePath,
        filename: input.filename,
        requestIp: input.requestIp,
        userAgent: input.userAgent,
        status: input.status
      });
    } catch (error) {
      console.error('[ADMIN_DELETE_HISTORY_ERROR]', error);
    }
  }
}