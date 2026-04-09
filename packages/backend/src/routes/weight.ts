// weight.ts — Body weight tracking routes.

import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { WeightService } from "../services/WeightService.js";

const service = new WeightService(db);

export async function weightRoutes(app: FastifyInstance) {

  app.post<{ Body: { weight_kg: number; notes?: string } }>(
    "/weight",
    async (req, reply) => {
      const { weight_kg, notes } = req.body;
      const result = service.create(weight_kg, notes);
      return reply.code(201).send(result);
    }
  );

  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/weight",
    async (req) => {
      const from = req.query.from ? parseInt(req.query.from, 10) : undefined;
      const to = req.query.to ? parseInt(req.query.to, 10) : undefined;
      return service.getAll(from, to);
    }
  );

  app.put<{ Params: { id: string }; Body: { weight_kg: number; notes?: string } }>(
    "/weight/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      const { weight_kg, notes } = req.body;
      const result = service.update(id, weight_kg, notes);
      if (!result) return reply.code(404).send({ error: "Weight entry not found" });
      return result;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/weight/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      const result = service.delete(id);
      if (!result) return reply.code(404).send({ error: "Weight entry not found" });
      return reply.code(204).send();
    }
  );
}
