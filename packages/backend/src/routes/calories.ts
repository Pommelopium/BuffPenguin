// calories.ts — Calorie tracking routes.

import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { CalorieService } from "../services/CalorieService.js";

const service = new CalorieService(db);

export async function calorieRoutes(app: FastifyInstance) {

  app.post<{ Body: { calories: number; date: string; notes?: string } }>(
    "/calories",
    async (req, reply) => {
      const { calories, date, notes } = req.body;
      const result = service.create(calories, date, notes);
      return reply.code(201).send(result);
    }
  );

  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/calories",
    async (req) => {
      return service.getRange(req.query.from, req.query.to);
    }
  );

  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/calories/daily",
    async (req) => {
      return service.getDailySums(req.query.from, req.query.to);
    }
  );

  app.put<{ Params: { id: string }; Body: { calories: number; notes?: string } }>(
    "/calories/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      const { calories, notes } = req.body;
      const result = service.update(id, calories, notes);
      if (!result) return reply.code(404).send({ error: "Calorie entry not found" });
      return result;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/calories/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id, 10);
      const result = service.delete(id);
      if (!result) return reply.code(404).send({ error: "Calorie entry not found" });
      return reply.code(204).send();
    }
  );
}
