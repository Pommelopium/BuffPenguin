// client.ts — Singleton database connection.
// Opens the SQLite file once at startup and exports a Drizzle ORM instance
// that all route handlers share. Using a singleton avoids the overhead of
// opening and closing the file on every request.

import Database from "better-sqlite3";              // external: native SQLite bindings for Node.js
import { drizzle } from "drizzle-orm/better-sqlite3"; // external: Drizzle ORM adapter for better-sqlite3
import * as schema from "./schema.js";
import { mkdirSync } from "fs";
import { dirname } from "path";

// DB_PATH can be overridden via environment variable, which the systemd
// service file sets to an absolute path on the Pi so the database survives
// working-directory changes.
const dbPath = process.env.DB_PATH ?? "./data/buffpenguin.db";

// Ensure the parent directory exists before opening the file.
// `recursive: true` makes this a no-op if the directory already exists.
mkdirSync(dirname(dbPath), { recursive: true });

// Open the SQLite file. better-sqlite3 operates synchronously, which is
// appropriate here — SQLite has no network latency and sync I/O keeps
// the code straightforward without sacrificing performance on the Pi.
const sqlite = new Database(dbPath);

// WAL (Write-Ahead Logging) mode allows concurrent reads while a write
// is in progress, which avoids blocking the mirror module's polling
// requests when the mobile app is logging a set simultaneously.
sqlite.pragma("journal_mode = WAL");

// Enforce foreign key constraints at the SQLite level.
// SQLite disables FK checks by default; this pragma re-enables them
// so cascade deletes (e.g. removing a session's sets) work correctly.
sqlite.pragma("foreign_keys = ON");

// Wrap the raw SQLite connection in Drizzle for type-safe query building.
// Passing the schema object enables relational query helpers.
export const db = drizzle(sqlite, { schema });

// Export the raw connection for use in migrate.ts, which needs to pass
// it directly to the Drizzle migrator.
export { sqlite };
