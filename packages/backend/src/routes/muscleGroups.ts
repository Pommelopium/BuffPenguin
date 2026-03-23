import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { muscleGroups, exerciseMuscleGroups, workoutSets, exercises } from "../db/schema.js";
import { eq, sql, desc } from "drizzle-orm";

type Freshness = "today" | "recent" | "moderate" | "stale" | "untrained";

function getFreshness(daysSince: number | null): Freshness {
  if (daysSince === null) return "untrained";
  if (daysSince === 0) return "today";
  if (daysSince <= 3) return "recent";
  if (daysSince <= 6) return "moderate";
  return "stale";
}

export async function muscleGroupRoutes(app: FastifyInstance) {
  // List all muscle groups
  app.get("/muscle-groups", async () => {
    return db.select().from(muscleGroups).all();
  });

  // Freshness endpoint — used by the mirror module
  app.get<{ Querystring: { days?: string } }>("/muscle-groups/freshness", async (req) => {
    const lookbackDays = parseInt(req.query.days ?? "14", 10);
    const now = Math.floor(Date.now() / 1000);
    const lookbackCutoff = now - lookbackDays * 86400;

    const allGroups = db.select().from(muscleGroups).all();

    // For each muscle group, find the most recent workout set logged within lookback window
    const result = allGroups.map((group) => {
      const lastSet = db
        .select({ loggedAt: workoutSets.loggedAt })
        .from(workoutSets)
        .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
        .innerJoin(
          exerciseMuscleGroups,
          eq(exerciseMuscleGroups.exerciseId, exercises.id)
        )
        .where(eq(exerciseMuscleGroups.muscleGroupId, group.id))
        .orderBy(desc(workoutSets.loggedAt))
        .limit(1)
        .get();

      const lastTrainedAt = lastSet?.loggedAt ?? null;
      const daysSince =
        lastTrainedAt !== null
          ? Math.floor((now - lastTrainedAt) / 86400)
          : null;

      // Treat anything older than the lookback window as "untrained"
      const effectiveDaysSince =
        daysSince !== null && lastTrainedAt! >= lookbackCutoff
          ? daysSince
          : null;

      return {
        id: group.id,
        name: group.name,
        slug: group.slug,
        last_trained_at: lastTrainedAt,
        days_since: effectiveDaysSince,
        freshness: getFreshness(effectiveDaysSince),
      };
    });

    return { generated_at: now, groups: result };
  });
}
