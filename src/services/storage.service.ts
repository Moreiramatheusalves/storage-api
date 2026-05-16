import fs from 'fs';
import path from 'path';
import { ensureDirectory } from '../utils/fs.util';
import { ensureAllowedFileType } from '../utils/file-signature.util';
import { normalizeRelativePath, resolveAppDirectory, resolveSafeAbsolutePath, sanitizeFileName } from '../utils/path.util';
import { sha256 } from '../utils/crypto.util';

async function safeUnlinkTemp(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[STORAGE_TMP_CLEANUP_ERROR]', error);
    }
  }
}

export class StorageService {
  async upload(input: {
    applicationId: string;
    directoryPath: string;
    fileName: string;
    buffer: Buffer;
  }): Promise<{ relativePath: string; sizeBytes: number; mimeType: string; sha256: string }> {
    const safeDirectory = normalizeRelativePath(input.directoryPath);
    const safeFileName = sanitizeFileName(input.fileName);
    const mimeType = ensureAllowedFileType(input.buffer);
    const appRoot = resolveAppDirectory(input.applicationId);
    const targetDirectory = resolveSafeAbsolutePath(input.applicationId, safeDirectory);
    const targetFilePath = path.join(targetDirectory, safeFileName);
    const normalizedTargetFilePath = path.resolve(targetFilePath);

    if (!normalizedTargetFilePath.startsWith(path.resolve(appRoot))) {
      throw new Error('Caminho final inválido.');
    }

    await ensureDirectory(targetDirectory);

    const tempFilePath = `${normalizedTargetFilePath}.tmp-${Date.now()}`;
    try {
      await fs.promises.writeFile(tempFilePath, input.buffer);
      await fs.promises.rename(tempFilePath, normalizedTargetFilePath);
    } catch (error) {
      await safeUnlinkTemp(tempFilePath);
      throw error;
    }

    return {
      relativePath: `${safeDirectory}/${safeFileName}`,
      sizeBytes: input.buffer.length,
      mimeType,
      sha256: sha256(input.buffer)
    };
  }

  async list(applicationId: string, directoryPath: string): Promise<string[]> {
    const safeDirectory = normalizeRelativePath(directoryPath);
    const targetDirectory = resolveSafeAbsolutePath(applicationId, safeDirectory);
    const items = await fs.promises.readdir(targetDirectory, { withFileTypes: true });

    return items.map((item) => `${item.name}${item.isDirectory() ? '/' : ''}`);
  }

  async getReadPayload(applicationId: string, relativePath: string): Promise<{ absolutePath: string; mimeType: string; fileName: string; sizeBytes: number; sha256: string }> {
    const safeRelativePath = normalizeRelativePath(relativePath);
    const absolutePath = resolveSafeAbsolutePath(applicationId, safeRelativePath);
    const fileBuffer = await fs.promises.readFile(absolutePath);
    const mimeType = ensureAllowedFileType(fileBuffer);

    return {
      absolutePath,
      mimeType,
      fileName: path.basename(absolutePath),
      sizeBytes: fileBuffer.length,
      sha256: sha256(fileBuffer)
    };
  }

  async delete(applicationId: string, relativePath: string): Promise<void> {
    const safeRelativePath = normalizeRelativePath(relativePath);
    const absolutePath = resolveSafeAbsolutePath(applicationId, safeRelativePath);
    await fs.promises.unlink(absolutePath);
  }
}
