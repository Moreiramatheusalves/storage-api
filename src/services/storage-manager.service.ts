import { StorageService } from './storage.service';
import { HistoryService } from './history.service';

interface StorageApplication {
  id: string;
  name: string;
}

interface RequestInfo {
  ip?: string;
  userAgent?: string;
}

export class StorageManagerService {
  constructor(
    private readonly storageService = new StorageService(),
    private readonly historyService = new HistoryService()
  ) {}

  async upload(
    application: StorageApplication,
    directoryPath: string,
    fileName: string,
    buffer: Buffer,
    requestInfo: RequestInfo
  ): Promise<{ relativePath: string; sizeBytes: number; mimeType: string; sha256: string }> {
    try {
      const result = await this.storageService.upload({
        applicationId: application.id,
        directoryPath,
        fileName,
        buffer
      });
      await this.recordSafely({
        applicationId: application.id,
        applicationName: application.name,
        action: 'UPLOAD',
        relativePath: result.relativePath,
        filename: fileName,
        sizeBytes: result.sizeBytes,
        mimeType: result.mimeType,
        sha256: result.sha256,
        requestIp: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        status: 'SUCCESS'
      });
      return result;
    } catch (error) {
      await this.recordSafely({
        applicationId: application.id,
        applicationName: application.name,
        action: 'UPLOAD',
        relativePath: directoryPath,
        filename: fileName,
        requestIp: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        status: 'ERROR'
      });
      throw error;
    }
  }

  async list(
    application: StorageApplication,
    directoryPath: string,
    requestInfo: RequestInfo
  ): Promise<string[]> {
    try {
      const items = await this.storageService.list(application.id, directoryPath);
      await this.recordSafely({
        applicationId: application.id,
        applicationName: application.name,
        action: 'LIST',
        relativePath: directoryPath,
        filename: '',
        requestIp: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        status: 'SUCCESS'
      });
      return items;
    } catch (error) {
      await this.recordSafely({
        applicationId: application.id,
        applicationName: application.name,
        action: 'LIST',
        relativePath: directoryPath,
        filename: '',
        requestIp: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        status: 'ERROR'
      });
      throw error;
    }
  }

  async getReadPayload(
    application: StorageApplication,
    relativePath: string,
    requestInfo: RequestInfo
  ): Promise<{ absolutePath: string; mimeType: string; fileName: string; sizeBytes: number; sha256: string }> {
    try {
      const payload = await this.storageService.getReadPayload(application.id, relativePath);
      await this.recordSafely({
        applicationId: application.id,
        applicationName: application.name,
        action: 'READ',
        relativePath,
        filename: payload.fileName,
        sizeBytes: payload.sizeBytes,
        mimeType: payload.mimeType,
        sha256: payload.sha256,
        requestIp: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        status: 'SUCCESS'
      });
      return payload;
    } catch (error) {
      await this.recordSafely({
        applicationId: application.id,
        applicationName: application.name,
        action: 'READ',
        relativePath,
        filename: '',
        requestIp: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        status: 'ERROR'
      });
      throw error;
    }
  }

  async delete(
    application: StorageApplication,
    relativePath: string,
    requestInfo: RequestInfo
  ): Promise<void> {
    try {
      await this.storageService.delete(application.id, relativePath);
      await this.recordSafely({
        applicationId: application.id,
        applicationName: application.name,
        action: 'DELETE',
        relativePath,
        filename: relativePath.split('/').pop() || '',
        requestIp: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        status: 'SUCCESS'
      });
    } catch (error) {
      await this.recordSafely({
        applicationId: application.id,
        applicationName: application.name,
        action: 'DELETE',
        relativePath,
        filename: relativePath.split('/').pop() || '',
        requestIp: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        status: 'ERROR'
      });
      throw error;
    }
  }

  private async recordSafely(input: Parameters<HistoryService['record']>[0]): Promise<void> {
    try {
      await this.historyService.record(input);
    } catch (error) {
      console.error('[HISTORY_RECORD_ERROR]', error);
    }
  }
}