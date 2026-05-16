import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const rootDir = path.resolve(__dirname, '..', '..');

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function resolveEnvPath(name: string, fallback: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    return path.resolve(fallback);
  }

  return path.resolve(value);
}

const defaultStorageRootDir =
  process.env.NODE_ENV === 'production'
    ? '/var/lib/storage-api'
    : path.join(rootDir, '.local-storage');

const storageRootDir = resolveEnvPath('STORAGE_ROOT_DIR', defaultStorageRootDir);
const storageDir = resolveEnvPath('STORAGE_DIR', path.join(storageRootDir, 'storage'));

export const env = {
  port: Number(process.env.PORT ?? 3999),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  baseUrl: requireEnv('BASE_URL', 'http://localhost:3999'),
  jwtSecret: requireEnv('JWT_SECRET'),
  adminUsername: requireEnv('ADMIN_USERNAME', 'admin'),
  adminPassword: requireEnv('ADMIN_PASSWORD'),
  maxUploadSize: Number(process.env.MAX_UPLOAD_SIZE ?? 10 * 1024 * 1024),
  globalRateLimitWindowMs: Number(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS ?? 60_000),
  globalRateLimitMax: Number(process.env.GLOBAL_RATE_LIMIT_MAX ?? 120),
  loginRateLimitWindowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? 900_000),
  loginRateLimitMax: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 10),

  rootDir,
  storageRootDir,
  storageDir,
  appsStorageDir: resolveEnvPath('APPS_STORAGE_DIR', path.join(storageDir, 'apps')),
  dataDir: resolveEnvPath('DATA_DIR', path.join(storageRootDir, 'data')),
  dbDir: resolveEnvPath('DB_DIR', path.join(storageRootDir, 'db')),
  tmpDir: resolveEnvPath('TMP_DIR', path.join(storageRootDir, 'tmp'))
};