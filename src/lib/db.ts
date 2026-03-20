import Database from "better-sqlite3";
import path from "path";
import { AppData, Sprint, WordEntry } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "wordcloud.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
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
