// muscleGroups.ts — Muscle group routes including the freshness endpoint.
// Thin HTTP layer that delegates business logic to MuscleGroupService.

import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { MuscleGroupService } from "../services/MuscleGroupService.js";

const service = new MuscleGroupService(db);

export async function muscleGroupRoutes(app: FastifyInstance) {

  app.get<{ Querystring: { locale?: string } }>("/muscle-groups", async (req) => {
    return service.getAll(req.query.locale);
  });

  app.get<{ Querystring: { days?: string; locale?: string } }>("/muscle-groups/freshness", async (req) => {
    const lookbackDays = parseInt(req.query.days ?? "14", 10);
    return service.getFreshness(lookbackDays, req.query.locale);
  });
}
