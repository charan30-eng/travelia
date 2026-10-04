/**
 * TRAVELIA PERSISTENT STORAGE - DATABASE CONNECTION
 * 
 * Provides a managed SQLite database connection using Node.js built-in `node:sqlite`.
 * Supports file-based storage for production/dev and `:memory:` for fast, isolated tests.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { runMigrations } from './migrations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseSync | null = null;
let currentDbPath: string | null = null;

/**
 * Resolves the default SQLite database file path.
 * Stored in `data/travelia.sqlite` relative to project root.
 */
export function getDefaultDbPath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return process.env.SQLITE_DB_PATH;
  }
  const projectRoot = path.resolve(__dirname, '../../');
  const dataDir = path.join(projectRoot, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'travelia.sqlite');
}

/**
 * Initializes and returns the active SQLite database instance.
 * Sets WAL mode and enforces foreign keys.
 */
export function getDatabase(dbPath?: string): DatabaseSync {
  const targetPath = dbPath || process.env.SQLITE_DB_PATH || getDefaultDbPath();

  if (dbInstance && currentDbPath === targetPath) {
    return dbInstance;
  }

  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }

  // Ensure parent directory exists for file-based DBs
  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);

  // Enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');
  
  // Use Write-Ahead Logging for better concurrent read/write throughput (for file DBs)
  if (targetPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
  }

  // Automatically ensure tables and indices exist
  runMigrations(db);

  dbInstance = db;
  currentDbPath = targetPath;

  return db;
}

/**
 * Closes the active database connection if open.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
    currentDbPath = null;
  }
}
