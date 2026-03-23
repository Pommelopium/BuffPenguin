import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { workoutSessions, workoutSets, exercises, exerciseMuscleGroups } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export async function workoutRoutes(app: FastifyInstance) {
  // Start a new session
  app.post("/sessions", async (req, reply) => {
    const now = Math.floor(Date.now() / 1000);
    const result = db
      .insert(workoutSessions)
      .values({ startedAt: now })
      .returning()
      .get();
    return reply.code(201).send(result);
  });

  // Update a session (end it, add notes)
  app.patch<{ Params: { id: string }; Body: { ended_at?: number; notes?: string } }>(
    "/sessions/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      const { ended_at, notes } = req.body ?? {};
      const result = db
        .update(workoutSessions)
        .set({ endedAt: ended_at, notes })
        .where(eq(workoutSessions.id, id))
        .returning()
        .get();
      if (!result) return reply.code(404).send({ error: "Session not found" });
      return result;
    }
  );

  // List recent sessions
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    "/sessions",
    async (req) => {
      const limit = Math.min(parseInt(req.query.limit ?? "20", 10), 100);
      const offset = parseInt(req.query.offset ?? "0", 10);
      return db
        .select()
        .from(workoutSessions)
        .orderBy(desc(workoutSessions.startedAt))
        .limit(limit)
        .offset(offset)
        .all();
    }
  );

  // Get session detail with all sets
  app.get<{ Params: { id: string } }>("/sessions/:id", async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const session = db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, id))
      .get();
    if (!session) return reply.code(404).send({ error: "Session not found" });
    const sets = db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, id))
      .all();
    return { ...session, sets };
  });

  // Log a set
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
    const session = db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, sessionId))
      .get();
    if (!session) return reply.code(404).send({ error: "Session not found" });

    const { exercise_id, set_number, reps, weight_kg, bodyweight } = req.body;
    const now = Math.floor(Date.now() / 1000);
    const result = db
      .insert(workoutSets)
      .values({
        sessionId,
        exerciseId: exercise_id,
        setNumber: set_number,
        reps,
        weightKg: weight_kg,
        bodyweight: bodyweight ? 1 : 0,
        loggedAt: now,
      })
      .returning()
      .get();
    return reply.code(201).send(result);
  });

  // Remove a set
  app.delete<{ Params: { id: string; setId: string } }>(
    "/sessions/:id/sets/:setId",
    async (req, reply) => {
      const setId = parseInt(req.params.setId, 10);
      const result = db
        .delete(workoutSets)
        .where(eq(workoutSets.id, setId))
        .returning()
        .get();
      if (!result) return reply.code(404).send({ error: "Set not found" });
      return reply.code(204).send();
    }
  );
}
