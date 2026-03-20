import { neon } from "@neondatabase/serverless";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";
const sqlitePath =
  process.env.SQLITE_DB_PATH?.trim() ||
  process.env.WORD_CLOUD_DB_PATH?.trim() ||
  path.join(process.cwd(), "data", "wordcloud.db");

if (!databaseUrl) {
  console.error(
    "Set DATABASE_URL or POSTGRES_URL before running this migration."
  );
  process.exit(1);
}

if (!fs.existsSync(sqlitePath)) {
  console.log(`No SQLite database found at ${sqlitePath}. Nothing to migrate.`);
  process.exit(0);
}

const sqlite = new Database(sqlitePath, { readonly: true });
const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS words (
    id BIGSERIAL PRIMARY KEY,
    sprint_id TEXT NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    timestamp BIGINT NOT NULL
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_words_sprint_id ON words(sprint_id)
`;

const sprints = sqlite
  .prepare("SELECT id, name, created_at FROM sprints ORDER BY created_at DESC")
  .all();
const words = sqlite
  .prepare("SELECT id, sprint_id, word, timestamp FROM words ORDER BY id ASC")
  .all();

for (const sprint of sprints) {
  await sql`
    INSERT INTO sprints (id, name, created_at)
    VALUES (${sprint.id}, ${sprint.name}, ${sprint.created_at})
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      created_at = EXCLUDED.created_at
  `;
}

for (const word of words) {
  await sql`
    INSERT INTO words (id, sprint_id, word, timestamp)
    VALUES (${word.id}, ${word.sprint_id}, ${word.word}, ${word.timestamp})
    ON CONFLICT (id) DO UPDATE
    SET
      sprint_id = EXCLUDED.sprint_id,
      word = EXCLUDED.word,
      timestamp = EXCLUDED.timestamp
  `;
}

await sql`
  SELECT setval(
    pg_get_serial_sequence('words', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM words), 0), 1),
    EXISTS (SELECT 1 FROM words)
  )
`;

sqlite.close();

console.log(
  `Migrated ${sprints.length} sprint(s) and ${words.length} word(s) from ${sqlitePath}.`
);
