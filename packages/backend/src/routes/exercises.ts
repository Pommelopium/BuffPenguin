import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { exercises, exerciseMuscleGroups, muscleGroups } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function exerciseRoutes(app: FastifyInstance) {
  // List all exercises with their muscle group mappings
  app.get("/exercises", async () => {
    const allExercises = db.select().from(exercises).all();
    return Promise.all(
      allExercises.map(async (exercise) => {
        const muscleGroupMappings = db
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
        return { ...exercise, muscleGroups: muscleGroupMappings };
      })
    );
  });

  // Create a custom exercise
  app.post<{
    Body: {
      name: string;
      muscle_groups: Array<{ id: number; role: "primary" | "secondary" }>;
    };
  }>("/exercises", async (req, reply) => {
    const { name, muscle_groups } = req.body;

    const exercise = db
      .insert(exercises)
      .values({ name })
      .returning()
      .get();

    if (muscle_groups?.length) {
      db.insert(exerciseMuscleGroups)
        .values(
          muscle_groups.map((mg) => ({
            exerciseId: exercise.id,
            muscleGroupId: mg.id,
            role: mg.role,
          }))
        )
        .run();
    }

    return reply.code(201).send(exercise);
  });
}
