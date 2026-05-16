import { v4 as uuidv4 } from 'uuid';
import { SqlStoreService } from './sql-store.service';
import { generateSecureToken, sha256, timingSafeHashCompare } from '../utils/crypto.util';
import { ApplicationTokenRecord } from '../types/models';

export class ApplicationTokenService {
  constructor(private readonly store = new SqlStoreService()) {}

  async listApplications(): Promise<Omit<ApplicationTokenRecord, 'tokenHash'>[]> {
    const rows = this.store.all<{
      id: string;
      name: string;
      isActive: number;
      createdAt: string;
      updatedAt: string;
    }>('SELECT id, name, isActive, createdAt, updatedAt FROM applications');
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      isActive: !!row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  async createApplication(
    name: string
  ): Promise<{ token: string; application: Omit<ApplicationTokenRecord, 'tokenHash'> }> {
    const now = new Date().toISOString();
    const token = generateSecureToken();
    const applicationId = uuidv4();
    const hash = sha256(token);
    this.store.run(
      'INSERT INTO applications (id, name, tokenHash, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [applicationId, name, hash, 1, now, now]
    );
    return {
      token,
      application: {
        id: applicationId,
        name,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    };
  }

  async rotateToken(applicationId: string): Promise<string> {
    const application = this.store.get<{ id: string }>(
      'SELECT id FROM applications WHERE id = ?',
      [applicationId]
    );
    if (!application) {
      throw new Error('Aplicação não encontrada.');
    }
    const newToken = generateSecureToken();
    const hash = sha256(newToken);
    const updatedAt = new Date().toISOString();
    this.store.run(
      'UPDATE applications SET tokenHash = ?, updatedAt = ? WHERE id = ?',
      [hash, updatedAt, applicationId]
    );
    return newToken;
  }

  async setActive(applicationId: string, isActive: boolean): Promise<void> {
    const application = this.store.get<{ id: string }>(
      'SELECT id FROM applications WHERE id = ?',
      [applicationId]
    );
    if (!application) {
      throw new Error('Aplicação não encontrada.');
    }
    const updatedAt = new Date().toISOString();
    this.store.run(
      'UPDATE applications SET isActive = ?, updatedAt = ? WHERE id = ?',
      [isActive ? 1 : 0, updatedAt, applicationId]
    );
  }

  async validateToken(
    token: string
  ): Promise<Omit<ApplicationTokenRecord, 'tokenHash'> | null> {
    const applications = this.store.all<{
      id: string;
      name: string;
      tokenHash: string;
      isActive: number;
      createdAt: string;
      updatedAt: string;
    }>('SELECT id, name, tokenHash, isActive, createdAt, updatedAt FROM applications WHERE isActive = 1');
    for (const application of applications) {
      if (timingSafeHashCompare(token, application.tokenHash)) {
        return {
          id: application.id,
          name: application.name,
          isActive: true,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt
        };
      }
    }
    return null;
  }
}
