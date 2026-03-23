// workouts.ts — Workout session and set routes.
// Handles the core data entry flow: starting a session, logging individual
// sets within it, and ending the session. All timestamps are stored as
// Unix epoch seconds (integers) to avoid timezone issues on the Pi.

import type { FastifyInstance } from "fastify"; // external: Fastify type definitions
import { db } from "../db/client.js";
import { workoutSessions, workoutSets, exercises, exerciseMuscleGroups } from "../db/schema.js";
import { eq, desc } from "drizzle-orm"; // external: Drizzle ORM query operators

export async function workoutRoutes(app: FastifyInstance) {

  // POST /sessions — creates a new workout session with the current timestamp.
  // Called by the mobile app when the user taps "Start Workout".
  // Returns the new session object including its generated id.
  app.post("/sessions", async (req, reply) => {
    const now = Math.floor(Date.now() / 1000); // convert JS milliseconds to Unix seconds
    const result = db
      .insert(workoutSessions) // writes to workout_sessions table
      .values({ startedAt: now })
      .returning()
      .get();
    return reply.code(201).send(result);
  });

  // PATCH /sessions/:id — updates an existing session.
  // Used to set endedAt when the user finishes their workout,
  // and optionally to attach free-text notes.
  app.patch<{ Params: { id: string }; Body: { ended_at?: number; notes?: string } }>(
    "/sessions/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      const { ended_at, notes } = req.body ?? {};
      const result = db
        .update(workoutSessions) // updates workout_sessions table
        .set({ endedAt: ended_at, notes })
        .where(eq(workoutSessions.id, id))
        .returning()
        .get();
      if (!result) return reply.code(404).send({ error: "Session not found" });
      return result;
    }
  );

  // GET /sessions — returns recent sessions in reverse chronological order.
  // Used by the mobile app's history screen. Capped at 100 rows per request
  // to avoid sending excessive data over the local network.
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    "/sessions",
    async (req) => {
      const limit = Math.min(parseInt(req.query.limit ?? "20", 10), 100);
      const offset = parseInt(req.query.offset ?? "0", 10);
      return db
        .select() // reads from workout_sessions table
        .from(workoutSessions)
        .orderBy(desc(workoutSessions.startedAt))
        .limit(limit)
        .offset(offset)
        .all();
    }
  );

  // GET /sessions/:id — returns full session detail including all logged sets.
  // Used by the history detail screen in the mobile app.
  app.get<{ Params: { id: string } }>("/sessions/:id", async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const session = db
      .select() // reads from workout_sessions table
      .from(workoutSessions)
      .where(eq(workoutSessions.id, id))
      .get();
    if (!session) return reply.code(404).send({ error: "Session not found" });

    // Fetch all sets for this session in a separate query.
    const sets = db
      .select() // reads from workout_sets table
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, id))
      .all();
    return { ...session, sets };
  });

  // POST /sessions/:id/sets — logs a single set within a session.
  // The mobile app calls this once per set as the user taps "Log Set".
  // Validates the parent session exists before inserting.
  app.post<{
    Params: { id: string };
    Body: {
      exercise_id: number;
      set_number: number;
      reps?: number;
      weight_kg?: number;
      bodyweight?: boolean;
    };
  }>("/sessions/:id/sets", async (req, reply) => {
    const sessionId = parseInt(req.params.id, 10);

    // Guard: ensure the session exists before inserting a set.
    const session = db
      .select() // reads from workout_sessions table
      .from(workoutSessions)
      .where(eq(workoutSessions.id, sessionId))
      .get();
    if (!session) return reply.code(404).send({ error: "Session not found" });

    const { exercise_id, set_number, reps, weight_kg, bodyweight } = req.body;
    const now = Math.floor(Date.now() / 1000);
    const result = db
      .insert(workoutSets) // writes to workout_sets table
      .values({
        sessionId,
        exerciseId: exercise_id,
        setNumber: set_number,
        reps,
        weightKg: weight_kg,
        bodyweight: bodyweight ? 1 : 0, // SQLite stores booleans as integers
        loggedAt: now,                  // timestamp used by the freshness calculation
      })
      .returning()
      .get();
    return reply.code(201).send(result);
  });

  // DELETE /sessions/:id/sets/:setId — removes a mistakenly logged set.
  // The session id in the URL is accepted but not used for the delete —
  // sets are uniquely identified by their own id. Returns 204 No Content.
  app.delete<{ Params: { id: string; setId: string } }>(
    "/sessions/:id/sets/:setId",
    async (req, reply) => {
      const setId = parseInt(req.params.setId, 10);
      const result = db
        .delete(workoutSets) // deletes from workout_sets table
        .where(eq(workoutSets.id, setId))
        .returning()
        .get();
      if (!result) return reply.code(404).send({ error: "Set not found" });
      return reply.code(204).send();
    }
  );
}
