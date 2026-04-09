// workouts.ts — Workout session and set routes.
// Thin HTTP layer that delegates business logic to WorkoutService.

import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { WorkoutService } from "../services/WorkoutService.js";

const service = new WorkoutService(db);

export async function workoutRoutes(app: FastifyInstance) {

  app.post("/sessions", async (req, reply) => {
    return reply.code(201).send(service.createSession());
  });

  app.patch<{ Params: { id: string }; Body: { ended_at?: number; notes?: string } }>(
    "/sessions/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      const { ended_at, notes } = req.body ?? {};
      const result = service.updateSession(id, ended_at, notes);
      if (!result) return reply.code(404).send({ error: "Session not found" });
      return result;
    }
  );

  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    "/sessions",
    async (req) => {
      const limit = Math.min(parseInt(req.query.limit ?? "20", 10), 100);
      const offset = parseInt(req.query.offset ?? "0", 10);
      return service.getSessions(limit, offset);
    }
  );

  app.get<{ Params: { id: string } }>("/sessions/:id", async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const result = service.getSession(id);
    if (!result) return reply.code(404).send({ error: "Session not found" });
    return result;
  });

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
    const result = service.addSet(sessionId, req.body);
    if (!result) return reply.code(404).send({ error: "Session not found" });
    return reply.code(201).send(result);
  });

  app.delete<{ Params: { id: string; setId: string } }>(
    "/sessions/:id/sets/:setId",
    async (req, reply) => {
      const setId = parseInt(req.params.setId, 10);
      const result = service.deleteSet(setId);
      if (!result) return reply.code(404).send({ error: "Set not found" });
      return reply.code(204).send();
    }
  );
}
