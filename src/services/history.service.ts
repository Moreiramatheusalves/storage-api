import { v4 as uuidv4 } from 'uuid';
import { FileAction, FileEvent } from '../types/models';
import { SqlStoreService } from './sql-store.service';

interface RecordHistoryInput {
  applicationId: string;
  applicationName: string;
  action: FileAction;
  relativePath: string;
  filename: string;
  sizeBytes?: number;
  mimeType?: string;
  sha256?: string;
  requestIp?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'ERROR';
}

export class HistoryService {
  constructor(private readonly store = new SqlStoreService()) {}

  async record(input: RecordHistoryInput): Promise<void> {
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    this.store.run(
      `INSERT INTO history (
        id, applicationId, applicationName, action, relativePath, filename,
        sizeBytes, mimeType, sha256, requestIp, userAgent, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.applicationId,
        input.applicationName,
        input.action,
        input.relativePath,
        input.filename,
        input.sizeBytes ?? null,
        input.mimeType ?? null,
        input.sha256 ?? null,
        input.requestIp ?? null,
        input.userAgent ?? null,
        input.status,
        createdAt
      ]
    );
  }

  async list(filters: {
    applicationId?: string;
    action?: FileAction;
    status?: 'SUCCESS' | 'ERROR';
    limit?: number;
    page?: number;
  }): Promise<{ items: FileEvent[]; total: number; page: number; pages: number }> {
    const limit = Math.max(1, Math.min(filters.limit ?? 100, 1000));
    const page = Math.max(1, filters.page ?? 1);
    const whereClauses: string[] = [];
    const params: any[] = [];
    if (filters.applicationId) {
      whereClauses.push('applicationId = ?');
      params.push(filters.applicationId);
    }
    if (filters.action) {
      whereClauses.push('action = ?');
      params.push(filters.action);
    }
    if (filters.status) {
      whereClauses.push('status = ?');
      params.push(filters.status);
    }
    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const countRow = this.store.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM history ${where}`,
      params
    );
    const total = countRow ? countRow.count : 0;
    const offset = (page - 1) * limit;
    const items = this.store.all<FileEvent>(
      `SELECT id, applicationId, applicationName, action, relativePath, filename, sizeBytes, mimeType, sha256, requestIp, userAgent, status, createdAt
       FROM history ${where}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const pages = Math.ceil(total / limit) || 1;
    return { items, total, page, pages };
  }
}
