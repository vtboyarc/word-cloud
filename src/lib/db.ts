import Database from "better-sqlite3";
import os from "os";
import path from "path";
import fs from "fs";
import { AppData, Sprint, WordEntry } from "./types";

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "wordcloud.db");
const TMP_DB_PATH = path.join(os.tmpdir(), "word-cloud", "wordcloud.db");

let db: Database.Database | null = null;

function resolveDbPath(): string {
  const configuredPath = process.env.WORD_CLOUD_DB_PATH?.trim();
  if (configuredPath) {
    return configuredPath;
  }

  // Vercel functions cannot write inside the deployed bundle.
  if (process.env.VERCEL) {
    return TMP_DB_PATH;
  }

  return LOCAL_DB_PATH;
}

function isReadonlyFilesystemError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorWithCode = error as Error & { code?: string };
  const message = error.message.toLowerCase();

  return (
    errorWithCode.code === "EACCES" ||
    errorWithCode.code === "EPERM" ||
    errorWithCode.code === "EROFS" ||
    message.includes("readonly") ||
    message.includes("unable to open database file")
  );
}

function openDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  initSchema(instance);
  return instance;
}

function getDb(): Database.Database {
  if (!db) {
    const preferredPath = resolveDbPath();

    try {
      db = openDb(preferredPath);
    } catch (error) {
      if (preferredPath === TMP_DB_PATH || !isReadonlyFilesystemError(error)) {
        throw error;
      }

      console.warn(
        `Falling back to temporary SQLite storage at ${TMP_DB_PATH} because ${preferredPath} is not writable.`
      );
      db = openDb(TMP_DB_PATH);
    }
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sprints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sprint_id TEXT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_words_sprint_id ON words(sprint_id);
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    );
  `);
}

export function loadAllData(): AppData {
  const db = getDb();
  const sprintRows = db.prepare("SELECT id, name, created_at FROM sprints ORDER BY created_at DESC").all() as { id: string; name: string; created_at: number }[];
  const wordStmt = db.prepare("SELECT word, timestamp FROM words WHERE sprint_id = ? ORDER BY id ASC");

  const sprints: Sprint[] = sprintRows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    words: (wordStmt.all(row.id) as { word: string; timestamp: number }[]).map((w) => ({
      word: w.word,
      timestamp: w.timestamp,
    })),
  }));

  return { sprints, currentSprintId: sprints[0]?.id ?? null };
}

export function dbCreateSprint(id: string, name: string, createdAt: number): void {
  const db = getDb();
  db.prepare("INSERT INTO sprints (id, name, created_at) VALUES (?, ?, ?)").run(id, name, createdAt);
}

export function dbDeleteSprint(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sprints WHERE id = ?").run(id);
}

export function dbAddWord(sprintId: string, word: string, timestamp: number): void {
  const db = getDb();
  db.prepare("INSERT INTO words (sprint_id, word, timestamp) VALUES (?, ?, ?)").run(sprintId, word, timestamp);
}

export function dbAddToken(token: string): void {
  const db = getDb();
  db.prepare("INSERT INTO auth_tokens (token, created_at) VALUES (?, ?)").run(token, Date.now());
}

export function dbHasToken(token: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT 1 FROM auth_tokens WHERE token = ?").get(token);
  return !!row;
}

export function dbRemoveToken(token: string): void {
  const db = getDb();
  db.prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
}

export function dbRemoveWord(sprintId: string, index: number): void {
  const db = getDb();
  // Get the nth word for this sprint by rowid order
  const row = db.prepare(
    "SELECT id FROM words WHERE sprint_id = ? ORDER BY id ASC LIMIT 1 OFFSET ?"
  ).get(sprintId, index) as { id: number } | undefined;
  if (row) {
    db.prepare("DELETE FROM words WHERE id = ?").run(row.id);
  }
}
