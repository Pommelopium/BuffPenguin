// reset.ts — Drops and recreates the database from scratch.
// Deletes the SQLite file, runs drizzle-kit push to recreate tables,
// then re-seeds muscle groups and exercises.
//
// Usage: npm run db:reset --workspace=packages/backend
//
// WARNING: This destroys ALL existing data (workouts, weight, calories, etc.).

import { existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "../..");

const dbPath = process.env.DB_PATH ?? resolve(backendRoot, "data/buffpenguin.db");
const walPath = `${dbPath}-wal`;
const shmPath = `${dbPath}-shm`;

// Step 1: Delete existing database files
for (const file of [dbPath, walPath, shmPath]) {
  if (existsSync(file)) {
    unlinkSync(file);
    console.log(`Deleted ${file}`);
  }
}
console.log("Database removed.\n");

// Step 2: Recreate tables from schema
console.log("Recreating tables...");
execSync("npx drizzle-kit push", { cwd: backendRoot, stdio: "inherit" });
console.log("");

// Step 3: Re-seed data
console.log("Seeding muscle groups...");
execSync("npx tsx src/db/seed.ts", { cwd: backendRoot, stdio: "inherit" });

console.log("Seeding exercises...");
execSync("npx tsx src/db/seed-exercises.ts", { cwd: backendRoot, stdio: "inherit" });

console.log("\nDatabase reset complete.");
