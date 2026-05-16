import path from 'path';
import { env } from '../config/env';

const SEGMENT_REGEX = /^[a-zA-Z0-9._-]+$/;

export function normalizeRelativePath(input: string): string {
  const raw = (input || '').replace(/\\/g, '/').trim();
  if (!raw) {
    throw new Error('Path é obrigatório.');
  }

  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) {
    throw new Error('Path inválido.');
  }

  for (const part of parts) {
    if (part === '.' || part === '..') {
      throw new Error('Path traversal bloqueado.');
    }

    if (!SEGMENT_REGEX.test(part)) {
      throw new Error(`Segmento inválido no path: ${part}`);
    }
  }

  return parts.join('/');
}

export function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    throw new Error('Nome do arquivo é obrigatório.');
  }

  const baseName = path.basename(trimmed).replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!baseName || baseName === '.' || baseName === '..') {
    throw new Error('Nome do arquivo inválido.');
  }

  return baseName;
}

export function resolveAppDirectory(applicationId: string): string {
  return path.join(env.appsStorageDir, applicationId);
}

export function resolveSafeAbsolutePath(applicationId: string, relativePath: string): string {
  const appRoot = resolveAppDirectory(applicationId);
  const absolutePath = path.resolve(appRoot, relativePath);

  if (!absolutePath.startsWith(path.resolve(appRoot))) {
    throw new Error('Path final inválido.');
  }

  return absolutePath;
}
