import { neon } from "@neondatabase/serverless";
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { AppData, Sprint, WordEntry } from "./types";

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "wordcloud.db");
const TMP_DB_PATH = path.join(os.tmpdir(), "word-cloud", "wordcloud.db");
const POSTGRES_CONNECTION_STRING =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";

type NumericValue = number | string | bigint;
type PostgresSprintRow = { id: string; name: string; created_at: NumericValue };
type PostgresWordRow = {
  id: NumericValue;
  sprint_id: string;
  word: string;
  timestamp: NumericValue;
};
type PostgresTokenRow = { token: string };

const postgres = POSTGRES_CONNECTION_STRING ? neon(POSTGRES_CONNECTION_STRING) : null;

let postgresSchemaPromise: Promise<void> | null = null;
let sqliteDb: Database.Database | null = null;

function toNumber(value: NumericValue): number {
  return typeof value === "number" ? value : Number(value);
}

function resolveSqlitePath(): string {
  const configuredPath = process.env.WORD_CLOUD_DB_PATH?.trim();
  if (configuredPath) {
    return configuredPath;
  }

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

function initSqliteSchema(db: Database.Database) {
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

function openSqliteDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSqliteSchema(db);
  return db;
}

function getSqliteDb(): Database.Database {
  if (!sqliteDb) {
    const preferredPath = resolveSqlitePath();

    try {
      sqliteDb = openSqliteDb(preferredPath);
    } catch (error) {
      if (preferredPath === TMP_DB_PATH || !isReadonlyFilesystemError(error)) {
        throw error;
      }

      console.warn(
        `Falling back to temporary SQLite storage at ${TMP_DB_PATH} because ${preferredPath} is not writable.`
      );
      sqliteDb = openSqliteDb(TMP_DB_PATH);
    }
  }

  return sqliteDb;
}

async function ensurePostgresSchema(): Promise<void> {
  if (!postgres) {
    return;
  }

  postgresSchemaPromise ??= (async () => {
    await postgres`
      CREATE TABLE IF NOT EXISTS sprints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )
    `;

    await postgres`
      CREATE TABLE IF NOT EXISTS words (
        id BIGSERIAL PRIMARY KEY,
        sprint_id TEXT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
        word TEXT NOT NULL,
        timestamp BIGINT NOT NULL
      )
    `;

    await postgres`
      CREATE INDEX IF NOT EXISTS idx_words_sprint_id ON words(sprint_id)
    `;

    await postgres`
      CREATE TABLE IF NOT EXISTS auth_tokens (
        token TEXT PRIMARY KEY,
        created_at BIGINT NOT NULL
      )
    `;
  })();

  await postgresSchemaPromise;
}

function buildAppData(
  sprintRows: Array<{ id: string; name: string; created_at: NumericValue }>,
  wordsBySprint: Map<string, WordEntry[]>
): AppData {
  const sprints: Sprint[] = sprintRows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: toNumber(row.created_at),
    words: wordsBySprint.get(row.id) ?? [],
  }));

  return { sprints, currentSprintId: sprints[0]?.id ?? null };
}

async function loadPostgresData(): Promise<AppData> {
  await ensurePostgresSchema();

  if (!postgres) {
    throw new Error("Postgres client not configured");
  }

  const sprintRows = (await postgres`
    SELECT id, name, created_at
    FROM sprints
    ORDER BY created_at DESC
  `) as PostgresSprintRow[];
  const wordRows = (await postgres`
    SELECT id, sprint_id, word, timestamp
    FROM words
    ORDER BY id ASC
  `) as PostgresWordRow[];

  const wordsBySprint = new Map<string, WordEntry[]>();
  for (const row of wordRows) {
    const entries = wordsBySprint.get(row.sprint_id) ?? [];
    entries.push({
      word: row.word,
      timestamp: toNumber(row.timestamp),
    });
    wordsBySprint.set(row.sprint_id, entries);
  }

  return buildAppData(sprintRows, wordsBySprint);
}

function loadSqliteData(): AppData {
  const db = getSqliteDb();
  const sprintRows = db
    .prepare("SELECT id, name, created_at FROM sprints ORDER BY created_at DESC")
    .all() as PostgresSprintRow[];
  const wordStmt = db.prepare(
    "SELECT word, timestamp FROM words WHERE sprint_id = ? ORDER BY id ASC"
  );

  const wordsBySprint = new Map<string, WordEntry[]>();
  for (const row of sprintRows) {
    const words = wordStmt.all(row.id) as Array<{ word: string; timestamp: number }>;
    wordsBySprint.set(
      row.id,
      words.map((word) => ({
        word: word.word,
        timestamp: word.timestamp,
      }))
    );
  }

  return buildAppData(sprintRows, wordsBySprint);
}

export async function loadAllData(): Promise<AppData> {
  if (postgres) {
    return loadPostgresData();
  }

  return loadSqliteData();
}

export async function dbCreateSprint(
  id: string,
  name: string,
  createdAt: number
): Promise<void> {
  if (postgres) {
    await ensurePostgresSchema();
    await postgres`
      INSERT INTO sprints (id, name, created_at)
      VALUES (${id}, ${name}, ${createdAt})
    `;
    return;
  }

  const db = getSqliteDb();
  db.prepare("INSERT INTO sprints (id, name, created_at) VALUES (?, ?, ?)").run(
    id,
    name,
    createdAt
  );
}

export async function dbDeleteSprint(id: string): Promise<void> {
  if (postgres) {
    await ensurePostgresSchema();
    await postgres`
      DELETE FROM sprints
      WHERE id = ${id}
    `;
    return;
  }

  const db = getSqliteDb();
  db.prepare("DELETE FROM sprints WHERE id = ?").run(id);
}

export async function dbAddWord(
  sprintId: string,
  word: string,
  timestamp: number
): Promise<void> {
  if (postgres) {
    await ensurePostgresSchema();
    await postgres`
      INSERT INTO words (sprint_id, word, timestamp)
      VALUES (${sprintId}, ${word}, ${timestamp})
    `;
    return;
  }

  const db = getSqliteDb();
  db.prepare("INSERT INTO words (sprint_id, word, timestamp) VALUES (?, ?, ?)").run(
    sprintId,
    word,
    timestamp
  );
}

export async function dbAddToken(token: string): Promise<void> {
  if (postgres) {
    await ensurePostgresSchema();
    await postgres`
      INSERT INTO auth_tokens (token, created_at)
      VALUES (${token}, ${Date.now()})
      ON CONFLICT (token) DO NOTHING
    `;
    return;
  }

  const db = getSqliteDb();
  db.prepare("INSERT INTO auth_tokens (token, created_at) VALUES (?, ?)").run(
    token,
    Date.now()
  );
}

export async function dbHasToken(token: string): Promise<boolean> {
  if (postgres) {
    await ensurePostgresSchema();
    const rows = (await postgres`
      SELECT token
      FROM auth_tokens
      WHERE token = ${token}
      LIMIT 1
    `) as PostgresTokenRow[];
    return rows.length > 0;
  }

  const db = getSqliteDb();
  const row = db.prepare("SELECT 1 FROM auth_tokens WHERE token = ?").get(token);
  return !!row;
}

export async function dbRemoveToken(token: string): Promise<void> {
  if (postgres) {
    await ensurePostgresSchema();
    await postgres`
      DELETE FROM auth_tokens
      WHERE token = ${token}
    `;
    return;
  }

  const db = getSqliteDb();
  db.prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
}

export async function dbRemoveWord(
  sprintId: string,
  index: number
): Promise<void> {
  if (postgres) {
    await ensurePostgresSchema();
    await postgres`
      WITH target AS (
        SELECT id
        FROM words
        WHERE sprint_id = ${sprintId}
        ORDER BY id ASC
        OFFSET ${index}
        LIMIT 1
      )
      DELETE FROM words
      WHERE id IN (SELECT id FROM target)
    `;
    return;
  }

  const db = getSqliteDb();
  const row = db
    .prepare(
      "SELECT id FROM words WHERE sprint_id = ? ORDER BY id ASC LIMIT 1 OFFSET ?"
    )
    .get(sprintId, index) as { id: number } | undefined;

  if (row) {
    db.prepare("DELETE FROM words WHERE id = ?").run(row.id);
  }
}
