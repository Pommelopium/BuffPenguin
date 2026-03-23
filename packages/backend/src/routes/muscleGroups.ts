// muscleGroups.ts — Muscle group routes including the freshness endpoint.
// The /freshness endpoint is the primary data source for the MagicMirror²
// module: it tells the mirror which muscle groups have been trained recently
// and how long ago, so the SVG overlay can be coloured accordingly.

import type { FastifyInstance } from "fastify"; // external: Fastify type definitions
import { db } from "../db/client.js";
import { muscleGroups, exerciseMuscleGroups, workoutSets, exercises } from "../db/schema.js";
import { eq, sql, desc } from "drizzle-orm"; // external: Drizzle ORM query operators

// Freshness buckets used as CSS class names on the SVG muscle regions.
// The mirror module applies these directly: .muscle-region.today { fill: #00ff88 } etc.
type Freshness = "today" | "recent" | "moderate" | "stale" | "untrained";

// Maps a number of days since last training to a freshness bucket.
// "untrained" covers both never-trained and trained outside the lookback window.
function getFreshness(daysSince: number | null): Freshness {
  if (daysSince === null) return "untrained";
  if (daysSince === 0)    return "today";
  if (daysSince <= 3)     return "recent";
  if (daysSince <= 6)     return "moderate";
  return "stale";
}

export async function muscleGroupRoutes(app: FastifyInstance) {

  // GET /muscle-groups — returns the full list of muscle groups.
  // Used by the mobile app when building the exercise creation form so
  // the user can assign muscle groups to a new exercise.
  app.get("/muscle-groups", async () => {
    return db.select().from(muscleGroups).all(); // reads from muscle_groups table
  });

  // GET /muscle-groups/freshness — the key endpoint consumed by the mirror module.
  // For each muscle group, calculates how many days have passed since the most
  // recent set that targeted it, then assigns a freshness bucket.
  // The mirror module polls this on an interval (default: every 60 seconds)
  // and uses the `slug` and `freshness` fields to update SVG element classes.
  //
  // Query param: days (default 14) — the lookback window. Muscle groups not
  // trained within this window are treated as "untrained" regardless of
  // whether they were trained before it.
  app.get<{ Querystring: { days?: string } }>("/muscle-groups/freshness", async (req) => {
    const lookbackDays = parseInt(req.query.days ?? "14", 10);
    const now = Math.floor(Date.now() / 1000);                   // current Unix timestamp (seconds)
    const lookbackCutoff = now - lookbackDays * 86400;           // earliest timestamp within the window

    const allGroups = db.select().from(muscleGroups).all(); // reads all rows from muscle_groups

    const result = allGroups.map((group) => {
      // For this muscle group, find the most recent workout_set whose exercise
      // targets it. This requires a three-table join:
      //   workout_sets → exercises → exercise_muscle_groups (filtered by muscle group id)
      // Only the loggedAt timestamp is needed — we take the single most recent row.
      const lastSet = db
        .select({ loggedAt: workoutSets.loggedAt })
        .from(workoutSets)
        .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))  // join exercises table
        .innerJoin(
          exerciseMuscleGroups,
          eq(exerciseMuscleGroups.exerciseId, exercises.id)              // join exercise_muscle_groups table
        )
        .where(eq(exerciseMuscleGroups.muscleGroupId, group.id))
        .orderBy(desc(workoutSets.loggedAt))
        .limit(1)
        .get(); // returns undefined if never trained

      const lastTrainedAt = lastSet?.loggedAt ?? null;

      // Convert the absolute timestamp to a relative "days ago" integer.
      const daysSince =
        lastTrainedAt !== null
          ? Math.floor((now - lastTrainedAt) / 86400)
          : null;

      // If the last training was outside the lookback window, treat it as
      // untrained — the mirror should not show stale data as still relevant.
      const effectiveDaysSince =
        daysSince !== null && lastTrainedAt! >= lookbackCutoff
          ? daysSince
          : null;

      return {
        id: group.id,
        name: group.name,
        slug: group.slug,             // used as the SVG element id by the mirror module
        last_trained_at: lastTrainedAt,
        days_since: effectiveDaysSince,
        freshness: getFreshness(effectiveDaysSince), // CSS class name applied to the SVG region
      };
    });

    // generated_at lets the mirror module display "Updated X min ago"
    return { generated_at: now, groups: result };
  });
}
