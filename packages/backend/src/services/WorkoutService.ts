// WorkoutService.ts — Business logic for workout sessions and sets.

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "../db/schema.js";
import { workoutSessions, workoutSets, exercises } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

interface SetInput {
  exercise_id: number;
  set_number: number;
  reps?: number;
  weight_kg?: number;
  bodyweight?: boolean;
}

export class WorkoutService {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  createSession() {
    const now = Math.floor(Date.now() / 1000);
    return this.db
      .insert(workoutSessions)
      .values({ startedAt: now })
      .returning()
      .get();
  }

  updateSession(id: number, endedAt?: number, notes?: string) {
    return this.db
      .update(workoutSessions)
      .set({ endedAt, notes })
      .where(eq(workoutSessions.id, id))
      .returning()
      .get();
  }

  getSessions(limit: number, offset: number) {
    return this.db
      .select()
      .from(workoutSessions)
      .orderBy(desc(workoutSessions.startedAt))
      .limit(limit)
      .offset(offset)
      .all();
  }

  getSession(id: number) {
    const session = this.db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, id))
      .get();
    if (!session) return null;

    const sets = this.db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, id))
      .all();
    return { ...session, sets };
  }

  addSet(sessionId: number, data: SetInput) {
    const session = this.db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, sessionId))
      .get();
    if (!session) return null;

    const now = Math.floor(Date.now() / 1000);
    return this.db
      .insert(workoutSets)
      .values({
        sessionId,
        exerciseId: data.exercise_id,
        setNumber: data.set_number,
        reps: data.reps,
        weightKg: data.weight_kg,
        bodyweight: data.bodyweight ? 1 : 0,
        loggedAt: now,
      })
      .returning()
      .get();
  }

  deleteSet(setId: number) {
    const result = this.db
      .delete(workoutSets)
      .where(eq(workoutSets.id, setId))
      .returning()
      .get();
    return result ?? null;
  }
}
