import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { AppError } from '../errors/app.error';
import { FileNotFoundError } from '../errors/file-not-found.error';
import { ensureDirectory } from '../utils/fs.util';
import { ensureAllowedReadableFileType } from '../utils/file-signature.util.js';
import { normalizeRelativePath, resolveAppDirectory, resolveSafeAbsolutePath, sanitizeFileName } from '../utils/path.util';
import { sha256 } from '../utils/crypto.util';

const FILE_INSPECTION_CHUNK_SIZE = 64 * 1024;
const FILE_SIGNATURE_SIZE = 12;

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
    const mimeType = ensureAllowedReadableFileType(input.buffer);
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

  async getReadPayload(
    applicationId: string,
    relativePath: string
  ): Promise<{
    absolutePath: string;
    mimeType: string;
    fileName: string;
    sizeBytes: number;
    sha256: string;
  }> {
    let safeRelativePath: string;
    let absolutePath: string;

    try {
      safeRelativePath = normalizeRelativePath(relativePath);
      absolutePath = resolveSafeAbsolutePath(applicationId, safeRelativePath);
    } catch {
      throw new AppError('Path inválido.', 400);
    }

    let fileHandle: fs.promises.FileHandle;
    try {
      fileHandle = await fs.promises.open(absolutePath, 'r');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFoundError();
      }

      throw error;
    }

    const signature = Buffer.alloc(FILE_SIGNATURE_SIZE);
    const chunk = Buffer.alloc(FILE_INSPECTION_CHUNK_SIZE);
    const hash = createHash('sha256');
    let sizeBytes = 0;

    try {
      while (true) {
        const { bytesRead } = await fileHandle.read(
          chunk,
          0,
          chunk.length,
          sizeBytes,
        );
        if (bytesRead === 0) break;

        if (sizeBytes < signature.length) {
          const signatureBytes = Math.min(
            bytesRead,
            signature.length - sizeBytes,
          );
          chunk.copy(signature, sizeBytes, 0, signatureBytes);
        }
        hash.update(chunk.subarray(0, bytesRead));
        sizeBytes += bytesRead;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new FileNotFoundError();
      }

      throw error;
    } finally {
      await fileHandle.close();
    }

    const allowExecutable =
      safeRelativePath === 'downloads/print-agent/AppOrdersPrintAgent-Setup-1.0.0.exe';

    const mimeType = ensureAllowedReadableFileType(
      signature.subarray(0, Math.min(sizeBytes, signature.length)),
      { allowExecutable },
    );

    return {
      absolutePath,
      mimeType,
      fileName: path.basename(absolutePath),
      sizeBytes,
      sha256: hash.digest('hex'),
    };
  }

  async delete(applicationId: string, relativePath: string): Promise<void> {
    const safeRelativePath = normalizeRelativePath(relativePath);
    const absolutePath = resolveSafeAbsolutePath(applicationId, safeRelativePath);
    await fs.promises.unlink(absolutePath);
  }
}
