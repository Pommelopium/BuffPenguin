// exercises.ts — Exercise catalogue routes.
// Thin HTTP layer that delegates business logic to ExerciseService.

import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { ExerciseService } from "../services/ExerciseService.js";

const service = new ExerciseService(db);

export async function exerciseRoutes(app: FastifyInstance) {

  app.get<{ Querystring: { locale?: string } }>("/exercises", async (req) => {
    return service.getAll(req.query.locale);
  });

  app.post<{
    Body: {
      name: string;
      muscle_groups: Array<{ id: number; role: "primary" | "secondary" }>;
    };
  }>("/exercises", async (req, reply) => {
    const { name, muscle_groups } = req.body;
    const exercise = service.create(name, muscle_groups);
    return reply.code(201).send(exercise);
  });
}
