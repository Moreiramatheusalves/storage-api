import fs from 'fs';
import path from 'path';
import sqlite from 'node:sqlite';
import { env } from '../config/env';

export class SqlStoreService {
  private db: sqlite.DatabaseSync;
  private readonly dbPath: string;

  constructor() {
    fs.mkdirSync(env.dbDir, { recursive: true });

    this.dbPath = path.join(env.dbDir, 'store.sqlite');
    this.db = new sqlite.DatabaseSync(this.dbPath);

    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tokenHash TEXT NOT NULL,
        isActive INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        applicationId TEXT,
        applicationName TEXT,
        action TEXT,
        relativePath TEXT,
        filename TEXT,
        sizeBytes INTEGER,
        mimeType TEXT,
        sha256 TEXT,
        requestIp TEXT,
        userAgent TEXT,
        status TEXT,
        createdAt TEXT NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS adminUsers (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_history_applicationId ON history(applicationId);
      CREATE INDEX IF NOT EXISTS idx_history_createdAt ON history(createdAt DESC);
    `);
  }

  getDatabasePath(): string {
    return this.dbPath;
  }

  run(sql: string, params: any[] = []): void {
    this.db.prepare(sql).run(...params);
  }

  get<T = any>(sql: string, params: any[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as unknown as T;
  }

  all<T = any>(sql: string, params: any[] = []): T[] {
    return this.db.prepare(sql).all(...params) as unknown as T[];
  }
}