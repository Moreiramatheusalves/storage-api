import bcrypt from 'bcryptjs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { SqlStoreService } from './sql-store.service';
import { ensureDirectory } from '../utils/fs.util';

type RuntimePaths = {
  nodeEnv: string;
  storageRootDir: string;
  storageDir: string;
  appsStorageDir: string;
  dataDir: string;
  dbDir: string;
  dbPath: string;
  tmpDir: string;
};

export class BootstrapService {
  private store: SqlStoreService | null;

  constructor(store?: SqlStoreService) {
    this.store = store ?? null;
  }

  async initialize(): Promise<void> {
    this.validateRuntimePaths();

    await ensureDirectory(env.storageRootDir);
    await ensureDirectory(env.storageDir);
    await ensureDirectory(env.appsStorageDir);
    await ensureDirectory(env.dataDir);
    await ensureDirectory(env.dbDir);
    await ensureDirectory(env.tmpDir);

    const store = this.getStore();

    const existingAdmin = store.get<{ id: string }>(
      'SELECT id FROM adminUsers WHERE username = ?',
      [env.adminUsername]
    );

    if (!existingAdmin) {
      const id = uuidv4();
      const now = new Date().toISOString();
      const passwordHash = await bcrypt.hash(env.adminPassword, 12);

      store.run(
        'INSERT INTO adminUsers (id, username, passwordHash, createdAt) VALUES (?, ?, ?, ?)',
        [id, env.adminUsername, passwordHash, now]
      );
    }
  }

  logRuntimePaths(): void {
    console.log('[STORAGE_RUNTIME_PATHS]', this.getRuntimePaths());
  }

  validateRuntimePaths(): void {
    const paths = this.getRuntimePaths();

    const managedRoot = paths.storageRootDir;
    const checkedPaths = [
      paths.storageDir,
      paths.appsStorageDir,
      paths.dataDir,
      paths.dbDir,
      paths.tmpDir,
      paths.dbPath
    ];

    const errors: string[] = [];

    if (env.nodeEnv === 'production' && process.platform === 'win32') {
      errors.push('NODE_ENV=production não deve rodar diretamente no Windows para esta configuração.');
    }

    if (env.nodeEnv === 'production' && managedRoot !== '/var/lib/storage-api') {
      errors.push(`STORAGE_ROOT_DIR inválido em produção: ${managedRoot}`);
    }

    for (const currentPath of checkedPaths) {
      if (this.isWindowsAbsolutePath(currentPath)) {
        errors.push(`Path Windows detectado em runtime: ${currentPath}`);
      }

      if (currentPath === env.rootDir || this.isInsideOrSame(env.rootDir, currentPath)) {
        errors.push(`Path dentro da raiz da aplicação detectado: ${currentPath}`);
      }

      if (currentPath === '/app' || currentPath.startsWith('/app/')) {
        errors.push(`Path antigo /app detectado: ${currentPath}`);
      }

      if (!this.isInsideOrSame(managedRoot, currentPath)) {
        errors.push(`Path fora do STORAGE_ROOT_DIR detectado: ${currentPath}`);
      }
    }

    if (errors.length > 0) {
      console.error('[STORAGE_RUNTIME_PATHS_INVALID]', {
        paths,
        errors
      });

      throw new Error('Configuração inválida dos diretórios da Storage API.');
    }
  }

  private getStore(): SqlStoreService {
    if (!this.store) {
      this.store = new SqlStoreService();
    }

    return this.store;
  }

  private getRuntimePaths(): RuntimePaths {
    return {
      nodeEnv: env.nodeEnv,
      storageRootDir: env.storageRootDir,
      storageDir: env.storageDir,
      appsStorageDir: env.appsStorageDir,
      dataDir: env.dataDir,
      dbDir: env.dbDir,
      dbPath: this.store?.getDatabasePath() ?? path.join(env.dbDir, 'store.sqlite'),
      tmpDir: env.tmpDir
    };
  }

  private isWindowsAbsolutePath(value: string): boolean {
    return /^[a-zA-Z]:[\\/]/.test(value);
  }

  private isInsideOrSame(parent: string, child: string): boolean {
    const relative = path.relative(path.resolve(parent), path.resolve(child));

    return (
      relative === '' ||
      (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
    );
  }
}