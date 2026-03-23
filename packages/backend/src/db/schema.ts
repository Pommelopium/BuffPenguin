import { int, integer, real, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";

export const muscleGroups = sqliteTable("muscle_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

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

export const workoutSessions = sqliteTable("workout_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: integer("started_at").notNull(),
  endedAt: integer("ended_at"),
  notes: text("notes"),
});

export const workoutSets = sqliteTable("workout_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps"),
  weightKg: real("weight_kg"),
  bodyweight: int("bodyweight").notNull().default(0),
  loggedAt: integer("logged_at").notNull(),
});

export type MuscleGroup = typeof muscleGroups.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
