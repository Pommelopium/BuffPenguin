// ExerciseService.ts — Business logic for the exercise catalogue.

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "../db/schema.js";
import { exercises, exerciseMuscleGroups, muscleGroups } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { translations } from "../i18n/TranslationLoader.js";

export class ExerciseService {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  getAll(locale?: string) {
    const allExercises = this.db.select().from(exercises).all();

    return allExercises.map((exercise) => {
      const muscleGroupMappings = this.db
        .select({
          id: muscleGroups.id,
          name: muscleGroups.name,
          slug: muscleGroups.slug,
          role: exerciseMuscleGroups.role,
        })
        .from(exerciseMuscleGroups)
        .innerJoin(muscleGroups, eq(exerciseMuscleGroups.muscleGroupId, muscleGroups.id))
        .where(eq(exerciseMuscleGroups.exerciseId, exercise.id))
        .all();

      return {
        ...exercise,
        localizedName: translations.getExerciseName(exercise.name, locale) ?? exercise.name,
        muscleGroups: muscleGroupMappings.map((mg) => ({
          ...mg,
          localizedName: translations.getMuscleGroupName(mg.slug, locale) ?? mg.name,
        })),
      };
    });
  }

  create(name: string, muscleGroupLinks: Array<{ id: number; role: "primary" | "secondary" }>) {
    const exercise = this.db
      .insert(exercises)
      .values({ name })
      .returning()
      .get();

    if (muscleGroupLinks?.length) {
      this.db
        .insert(exerciseMuscleGroups)
        .values(
          muscleGroupLinks.map((mg) => ({
            exerciseId: exercise.id,
            muscleGroupId: mg.id,
            role: mg.role,
          }))
        )
        .run();
    }

    return exercise;
  }
}
