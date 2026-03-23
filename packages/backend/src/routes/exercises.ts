// exercises.ts — Exercise catalogue routes.
// Manages the list of exercises available for logging. Each exercise
// is linked to one or more muscle groups so the freshness calculation
// in muscleGroups.ts can trace which muscles a set actually worked.

import type { FastifyInstance } from "fastify"; // external: Fastify type definitions
import { db } from "../db/client.js";
import { exercises, exerciseMuscleGroups, muscleGroups } from "../db/schema.js";
import { eq } from "drizzle-orm"; // external: Drizzle ORM equality operator

export async function exerciseRoutes(app: FastifyInstance) {

  // GET /exercises — returns all exercises with their muscle group mappings.
  // The mobile app calls this to populate the exercise picker on the log
  // set screen. Each exercise includes a muscleGroups array so the UI can
  // display which muscles are targeted.
  app.get("/exercises", async () => {
    const allExercises = db.select().from(exercises).all(); // reads from exercises table

    // For each exercise, join through exercise_muscle_groups to get the
    // linked muscle group names and roles. This is done in a loop rather
    // than a single join query to keep the result structure clean.
    return Promise.all(
      allExercises.map(async (exercise) => {
        const muscleGroupMappings = db
          .select({
            id: muscleGroups.id,
            name: muscleGroups.name,
            slug: muscleGroups.slug,
            role: exerciseMuscleGroups.role,
          })
          .from(exerciseMuscleGroups)       // reads from exercise_muscle_groups table
          .innerJoin(muscleGroups, eq(exerciseMuscleGroups.muscleGroupId, muscleGroups.id)) // joins muscle_groups
          .where(eq(exerciseMuscleGroups.exerciseId, exercise.id))
          .all();
        return { ...exercise, muscleGroups: muscleGroupMappings };
      })
    );
  });

  // POST /exercises — creates a new custom exercise and links it to muscle groups.
  // Used when the user logs an exercise that isn't in the existing catalogue.
  // The muscle_groups array contains objects with an id (from the muscle_groups
  // table) and a role ("primary" or "secondary").
  app.post<{
    Body: {
      name: string;
      muscle_groups: Array<{ id: number; role: "primary" | "secondary" }>;
    };
  }>("/exercises", async (req, reply) => {
    const { name, muscle_groups } = req.body;

    // Insert the exercise first to get its generated id.
    const exercise = db
      .insert(exercises) // writes to exercises table
      .values({ name })
      .returning()
      .get();

    // Bulk-insert all muscle group mappings in a single statement.
    // Skipped if no muscle groups were provided.
    if (muscle_groups?.length) {
      db.insert(exerciseMuscleGroups) // writes to exercise_muscle_groups table
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
