// schema.ts — Drizzle ORM database schema.
// This file is the single source of truth for the database structure.
// Running `drizzle-kit generate` reads this file and produces SQL migration
// files in the migrations/ folder. TypeScript types are inferred directly
// from the table definitions, so no separate type file is needed.

import { int, integer, real, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core"; // external: Drizzle ORM SQLite column helpers

// Stores the 11 supported muscle groups (e.g. "Chest", "Biceps").
// Seeded once via db/seed.ts. The slug is used as the SVG element ID
// in the mirror module to apply CSS freshness highlighting.
export const muscleGroups = sqliteTable("muscle_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(), // e.g. "chest" — must match id= attributes in muscle-overlay.svg
});

// User-defined or built-in exercises (e.g. "Barbell Bench Press").
// Each exercise can be linked to one or more muscle groups via exerciseMuscleGroups.
export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

// Junction table linking exercises to muscle groups.
// Each row records which muscle group an exercise targets and whether that
// muscle is the primary mover or a secondary stabiliser.
// Composite primary key prevents duplicate (exercise, muscle group) pairs.
export const exerciseMuscleGroups = sqliteTable(
  "exercise_muscle_groups",
  {
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id),
    muscleGroupId: integer("muscle_group_id")
      .notNull()
      .references(() => muscleGroups.id),
    role: text("role", { enum: ["primary", "secondary"] }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.exerciseId, t.muscleGroupId] }),
  })
);

// Represents one trip to the gym. A session is opened when the user
// starts a workout and closed (endedAt set) when they finish.
// All timestamps are Unix epoch seconds to avoid timezone complexity.
export const workoutSessions = sqliteTable("workout_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: integer("started_at").notNull(), // Unix epoch seconds
  endedAt: integer("ended_at"),               // null while session is active
  notes: text("notes"),
});

// Represents a single set within a workout session.
// Logging per-set (rather than per-exercise) preserves the full detail
// needed to track progressive overload over time.
// ON DELETE CASCADE ensures sets are removed if their parent session is deleted.
export const workoutSets = sqliteTable("workout_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id),
  setNumber: integer("set_number").notNull(), // 1-based position within session+exercise
  reps: integer("reps"),                      // null for timed/isometric sets
  weightKg: real("weight_kg"),               // null for bodyweight exercises
  bodyweight: int("bodyweight").notNull().default(0), // stored as 0/1 (SQLite has no boolean)
  loggedAt: integer("logged_at").notNull(),   // Unix epoch seconds — used by freshness calculation
});

// Inferred TypeScript types for use across the codebase.
// These stay in sync with the schema automatically — no manual maintenance needed.
export type MuscleGroup = typeof muscleGroups.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
