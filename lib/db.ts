import * as schema from "./schema";

// Use Turso (libsql) when env vars are set, otherwise fall back to local better-sqlite3
function createDb() {
  if (process.env.TURSO_DATABASE_URL) {
    const { drizzle } = require("drizzle-orm/libsql");
    const { createClient } = require("@libsql/client");
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return drizzle(client, { schema });
  }

  const { drizzle } = require("drizzle-orm/better-sqlite3");
  const Database = require("better-sqlite3");
  const path = require("path");
  const sqlite = new Database(path.join(process.cwd(), "loanfree.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export type DB = ReturnType<typeof getDb>;
