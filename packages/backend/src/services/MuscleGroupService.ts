// MuscleGroupService.ts — Business logic for muscle groups and freshness.

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "../db/schema.js";
import { muscleGroups, exerciseMuscleGroups, workoutSets, exercises } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { translations } from "../i18n/TranslationLoader.js";

type Freshness = "today" | "recent" | "moderate" | "stale" | "untrained";

export class MuscleGroupService {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  getAll(locale?: string) {
    const allGroups = this.db.select().from(muscleGroups).all();
    return allGroups.map((group) => ({
      ...group,
      localizedName: translations.getMuscleGroupName(group.slug, locale) ?? group.name,
    }));
  }

  getFreshness(lookbackDays: number, locale?: string) {
    const now = Math.floor(Date.now() / 1000);
    const lookbackCutoff = now - lookbackDays * 86400;

    const allGroups = this.db.select().from(muscleGroups).all();

    const groups = allGroups.map((group) => {
      const lastSet = this.db
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

      const effectiveDaysSince =
        daysSince !== null && lastTrainedAt! >= lookbackCutoff
          ? daysSince
          : null;

      return {
        id: group.id,
        name: group.name,
        slug: group.slug,
        localizedName: translations.getMuscleGroupName(group.slug, locale) ?? group.name,
        last_trained_at: lastTrainedAt,
        days_since: effectiveDaysSince,
        freshness: MuscleGroupService.getFreshnessLabel(effectiveDaysSince),
      };
    });

    return { generated_at: now, groups };
  }

  private static getFreshnessLabel(daysSince: number | null): Freshness {
    if (daysSince === null) return "untrained";
    if (daysSince === 0) return "today";
    if (daysSince <= 3) return "recent";
    if (daysSince <= 6) return "moderate";
    return "stale";
  }
}
