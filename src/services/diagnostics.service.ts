import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { SqlStoreService } from './sql-store.service';

type PathInfo = {
    path: string;
    exists: boolean;
    type: 'file' | 'directory' | 'other' | 'missing';
    sizeBytes?: number;
    modifiedAt?: string;
};

type DirectorySummary = {
    path: string;
    exists: boolean;
    directories: number;
    files: number;
    others: number;
    entries: number;
};

type TreeSample = {
    root: string;
    exists: boolean;
    files: number;
    directories: number;
    others: number;
    scannedEntries: number;
    scanLimit: number;
    limitReached: boolean;
};

export class DiagnosticsService {
    constructor(private readonly store = new SqlStoreService()) { }

    async getDiagnostics() {
        const dbPath = this.store.getDatabasePath();
        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;
        const legacyJsonPath = path.join(env.dataDir, 'store.json');

        const [
            storageRoot,
            storageDir,
            appsStorageDir,
            dataDir,
            dbDir,
            dbFile,
            walFile,
            shmFile,
            tmpDir,
            legacyJsonFile,
            storageSummary,
            appsSummary,
            appsTreeSample
        ] = await Promise.all([
            this.getPathInfo(env.storageRootDir),
            this.getPathInfo(env.storageDir),
            this.getPathInfo(env.appsStorageDir),
            this.getPathInfo(env.dataDir),
            this.getPathInfo(env.dbDir),
            this.getPathInfo(dbPath),
            this.getPathInfo(walPath),
            this.getPathInfo(shmPath),
            this.getPathInfo(env.tmpDir),
            this.getPathInfo(legacyJsonPath),
            this.getDirectorySummary(env.storageDir),
            this.getDirectorySummary(env.appsStorageDir),
            this.getTreeSample(env.appsStorageDir, 5000)
        ]);

        return {
            runtime: {
                nodeEnv: env.nodeEnv,
                platform: process.platform,
                storageRootDir: env.storageRootDir,
                storageDir: env.storageDir,
                appsStorageDir: env.appsStorageDir,
                dataDir: env.dataDir,
                dbDir: env.dbDir,
                dbPath,
                tmpDir: env.tmpDir
            },
            database: {
                engine: 'sqlite',
                officialStore: 'sqlite',
                jsonStoreEnabled: false,
                exists: dbFile.exists,
                sizeBytes: dbFile.sizeBytes ?? 0,
                walExists: walFile.exists,
                walSizeBytes: walFile.sizeBytes ?? 0,
                shmExists: shmFile.exists,
                shmSizeBytes: shmFile.sizeBytes ?? 0,
                tables: {
                    applications: this.countTable('applications'),
                    adminUsers: this.countTable('adminUsers'),
                    history: this.countTable('history')
                },
                files: {
                    sqlite: dbFile,
                    wal: walFile,
                    shm: shmFile
                }
            },
            storage: {
                paths: {
                    storageRoot,
                    storageDir,
                    appsStorageDir,
                    dataDir,
                    dbDir,
                    tmpDir
                },
                summaries: {
                    storageRoot: await this.getDirectorySummary(env.storageRootDir),
                    storage: storageSummary,
                    applicationsRoot: appsSummary
                },
                applicationDirectories: appsSummary.directories,
                rootEntries: storageSummary.entries,
                sample: appsTreeSample
            },
            legacy: {
                jsonStoreEnabled: false,
                jsonStorePath: legacyJsonPath,
                jsonStoreExists: legacyJsonFile.exists,
                jsonStoreFile: legacyJsonFile
            }
        };
    }

    private countTable(tableName: 'applications' | 'adminUsers' | 'history'): number {
        const row = this.store.get<{ count: number }>(
            `SELECT COUNT(*) as count FROM ${tableName}`
        );

        return row?.count ?? 0;
    }

    private async getPathInfo(targetPath: string): Promise<PathInfo> {
        try {
            const stats = await fs.promises.stat(targetPath);

            return {
                path: targetPath,
                exists: true,
                type: stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'other',
                sizeBytes: stats.size,
                modifiedAt: stats.mtime.toISOString()
            };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return {
                    path: targetPath,
                    exists: false,
                    type: 'missing'
                };
            }

            throw error;
        }
    }

    private async getDirectorySummary(targetPath: string): Promise<DirectorySummary> {
        try {
            const entries = await fs.promises.readdir(targetPath, { withFileTypes: true });

            let directories = 0;
            let files = 0;
            let others = 0;

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    directories += 1;
                } else if (entry.isFile()) {
                    files += 1;
                } else {
                    others += 1;
                }
            }

            return {
                path: targetPath,
                exists: true,
                directories,
                files,
                others,
                entries: entries.length
            };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return {
                    path: targetPath,
                    exists: false,
                    directories: 0,
                    files: 0,
                    others: 0,
                    entries: 0
                };
            }

            throw error;
        }
    }

    private async getTreeSample(root: string, scanLimit: number): Promise<TreeSample> {
        const rootInfo = await this.getPathInfo(root);

        if (!rootInfo.exists || rootInfo.type !== 'directory') {
            return {
                root,
                exists: rootInfo.exists,
                files: 0,
                directories: 0,
                others: 0,
                scannedEntries: 0,
                scanLimit,
                limitReached: false
            };
        }

        const stack = [root];
        let files = 0;
        let directories = 0;
        let others = 0;
        let scannedEntries = 0;
        let limitReached = false;

        while (stack.length > 0) {
            const current = stack.pop();

            if (!current) {
                continue;
            }

            const entries = await fs.promises.readdir(current, { withFileTypes: true });

            for (const entry of entries) {
                scannedEntries += 1;

                if (scannedEntries > scanLimit) {
                    limitReached = true;
                    break;
                }

                if (entry.isDirectory()) {
                    directories += 1;
                    stack.push(path.join(current, entry.name));
                } else if (entry.isFile()) {
                    files += 1;
                } else {
                    others += 1;
                }
            }

            if (limitReached) {
                break;
            }
        }

        return {
            root,
            exists: true,
            files,
            directories,
            others,
            scannedEntries: Math.min(scannedEntries, scanLimit),
            scanLimit,
            limitReached
        };
    }
}