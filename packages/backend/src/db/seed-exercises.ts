// seed-exercises.ts — Seeds the exercises table from the PDF reference list
// "A List of The Best Weight Training Exercises For Each Muscle Group".
//
// Run AFTER db:seed (muscle groups must exist first):
//   npm run db:seed-exercises --workspace=packages/backend
//
// Safe to re-run — onConflictDoNothing skips rows that already exist.
// Muscle group slugs must match those in seed.ts / muscle-overlay.svg.

import { eq } from "drizzle-orm";                           // external: Drizzle ORM condition helper
import { db } from "./client.js";
import { exercises, exerciseMuscleGroups, muscleGroups } from "./schema.js";

// ── Helpers ────────────────────────────────────────────────────────────────

// Preload all muscle group slugs → IDs into a Map so we can look them up
// without hitting the DB on every exercise insertion.
const mgBySlug = new Map(
  db.select({ id: muscleGroups.id, slug: muscleGroups.slug }) // external: Drizzle ORM select
    .from(muscleGroups)
    .all()
    .map((mg) => [mg.slug, mg.id])
);

// Insert an exercise by name if it doesn't exist, then return its ID.
// If the row already existed (conflict on unique name), fetch the existing ID.
function getOrInsertExercise(name: string): number {
  const inserted = db                                         // external: better-sqlite3 via Drizzle
    .insert(exercises)
    .values({ name })
    .onConflictDoNothing()
    .returning({ id: exercises.id })
    .get();
  if (inserted) return inserted.id;

  // Row already existed — fetch the ID
  const existing = db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.name, name))                          // external: Drizzle ORM eq()
    .get();
  return existing!.id;
}

type Role = "primary" | "secondary";
interface MuscleAssignment { slug: string; role: Role }

// Insert an exercise and its muscle group relationships.
// Junction rows that already exist are silently skipped.
function insertExercise(name: string, muscles: MuscleAssignment[]): void {
  const exerciseId = getOrInsertExercise(name);

  for (const { slug, role } of muscles) {
    const muscleGroupId = mgBySlug.get(slug);
    if (!muscleGroupId) {
      console.warn(`  Warning: unknown slug "${slug}" for exercise "${name}" — skipping`);
      continue;
    }
    db.insert(exerciseMuscleGroups)                           // external: better-sqlite3 via Drizzle
      .values({ exerciseId, muscleGroupId, role })
      .onConflictDoNothing()
      .run();
  }
}

// ── Exercise data ───────────────────────────────────────────────────────────
// Source: "A List of The Best Weight Training Exercises For Each Muscle Group"
// Primary = main mover(s) for the exercise.
// Secondary = stabilisers / synergists notably activated.
// Slugs map to packages/mirror-module/assets/muscle-overlay.svg ids.

// ── CHEST ───────────────────────────────────────────────────────────────────
// Compound chest exercises also activate triceps and anterior deltoid secondarily.

insertExercise("Flat Barbell or Dumbbell Bench Press", [
  { slug: "pectoralis-major-upper", role: "primary"    },
  { slug: "pectoralis-major-lower", role: "primary"    },
  { slug: "anterior-deltoid",       role: "secondary"  },
  { slug: "triceps-long-head",      role: "secondary"  },
  { slug: "triceps-lateral-head",   role: "secondary"  },
]);

insertExercise("Incline Barbell or Dumbbell Bench Press", [
  { slug: "pectoralis-major-upper", role: "primary"    },
  { slug: "pectoralis-major-lower", role: "secondary"  },
  { slug: "anterior-deltoid",       role: "secondary"  },
  { slug: "triceps-long-head",      role: "secondary"  },
  { slug: "triceps-lateral-head",   role: "secondary"  },
]);

insertExercise("Decline Barbell or Dumbbell Bench Press", [
  { slug: "pectoralis-major-lower", role: "primary"    },
  { slug: "pectoralis-major-upper", role: "secondary"  },
  { slug: "triceps-long-head",      role: "secondary"  },
  { slug: "triceps-lateral-head",   role: "secondary"  },
]);

insertExercise("Flat Chest Press Machine", [
  { slug: "pectoralis-major-upper", role: "primary"    },
  { slug: "pectoralis-major-lower", role: "primary"    },
  { slug: "triceps-long-head",      role: "secondary"  },
]);

insertExercise("Incline Chest Press Machine", [
  { slug: "pectoralis-major-upper", role: "primary"    },
  { slug: "pectoralis-major-lower", role: "secondary"  },
  { slug: "triceps-long-head",      role: "secondary"  },
]);

insertExercise("Decline Chest Press Machine", [
  { slug: "pectoralis-major-lower", role: "primary"    },
  { slug: "pectoralis-major-upper", role: "secondary"  },
  { slug: "triceps-long-head",      role: "secondary"  },
]);

// Forward-lean dip variant targets lower chest as primary
insertExercise("Chest Dips", [
  { slug: "pectoralis-major-lower", role: "primary"    },
  { slug: "pectoralis-major-upper", role: "secondary"  },
  { slug: "triceps-long-head",      role: "secondary"  },
  { slug: "triceps-lateral-head",   role: "secondary"  },
  { slug: "anterior-deltoid",       role: "secondary"  },
]);

insertExercise("Push-Ups", [
  { slug: "pectoralis-major-upper", role: "primary"    },
  { slug: "pectoralis-major-lower", role: "primary"    },
  { slug: "anterior-deltoid",       role: "secondary"  },
  { slug: "triceps-long-head",      role: "secondary"  },
  { slug: "serratus-anterior",      role: "secondary"  },
]);

insertExercise("Flat Dumbbell Flyes", [
  { slug: "pectoralis-major-upper", role: "primary"    },
  { slug: "pectoralis-major-lower", role: "primary"    },
  { slug: "anterior-deltoid",       role: "secondary"  },
]);

insertExercise("Incline Dumbbell Flyes", [
  { slug: "pectoralis-major-upper", role: "primary"    },
  { slug: "pectoralis-major-lower", role: "secondary"  },
  { slug: "anterior-deltoid",       role: "secondary"  },
]);

insertExercise("Decline Dumbbell Flyes", [
  { slug: "pectoralis-major-lower", role: "primary"    },
  { slug: "pectoralis-major-upper", role: "secondary"  },
]);

insertExercise("Pec Deck Machine", [
  { slug: "pectoralis-major-upper", role: "primary"    },
  { slug: "pectoralis-major-lower", role: "primary"    },
]);

insertExercise("Cable Crossovers / Cable Flyes", [
  { slug: "pectoralis-major-upper", role: "primary"    },
  { slug: "pectoralis-major-lower", role: "primary"    },
  { slug: "anterior-deltoid",       role: "secondary"  },
]);

// ── BACK ────────────────────────────────────────────────────────────────────
// Compound back exercises also activate biceps secondarily.

insertExercise("Pull-Ups", [
  { slug: "latissimus-dorsi",   role: "primary"    },
  { slug: "middle-trapezius",   role: "secondary"  },
  { slug: "rhomboids",          role: "secondary"  },
  { slug: "biceps-brachii",     role: "secondary"  },
  { slug: "brachialis",         role: "secondary"  },
]);

insertExercise("Chin-Ups", [
  { slug: "latissimus-dorsi",   role: "primary"    },
  { slug: "biceps-brachii",     role: "primary"    },
  { slug: "middle-trapezius",   role: "secondary"  },
  { slug: "brachialis",         role: "secondary"  },
]);

insertExercise("Lat Pull-Downs", [
  { slug: "latissimus-dorsi",   role: "primary"    },
  { slug: "middle-trapezius",   role: "secondary"  },
  { slug: "biceps-brachii",     role: "secondary"  },
  { slug: "brachialis",         role: "secondary"  },
]);

insertExercise("Bent Over Barbell or Dumbbell Rows", [
  { slug: "latissimus-dorsi",   role: "primary"    },
  { slug: "middle-trapezius",   role: "primary"    },
  { slug: "rhomboids",          role: "secondary"  },
  { slug: "biceps-brachii",     role: "secondary"  },
  { slug: "brachialis",         role: "secondary"  },
  { slug: "erector-spinae",     role: "secondary"  },
]);

insertExercise("T-Bar Rows", [
  { slug: "latissimus-dorsi",   role: "primary"    },
  { slug: "middle-trapezius",   role: "primary"    },
  { slug: "rhomboids",          role: "secondary"  },
  { slug: "biceps-brachii",     role: "secondary"  },
  { slug: "brachialis",         role: "secondary"  },
]);

insertExercise("Seated Cable Rows", [
  { slug: "latissimus-dorsi",   role: "primary"    },
  { slug: "middle-trapezius",   role: "primary"    },
  { slug: "rhomboids",          role: "secondary"  },
  { slug: "biceps-brachii",     role: "secondary"  },
  { slug: "brachialis",         role: "secondary"  },
]);

insertExercise("Chest Supported Barbell or Dumbbell Rows", [
  { slug: "middle-trapezius",   role: "primary"    },
  { slug: "rhomboids",          role: "primary"    },
  { slug: "latissimus-dorsi",   role: "secondary"  },
  { slug: "biceps-brachii",     role: "secondary"  },
  { slug: "posterior-deltoid",  role: "secondary"  },
]);

insertExercise("Chest Supported Machine Rows", [
  { slug: "middle-trapezius",   role: "primary"    },
  { slug: "rhomboids",          role: "primary"    },
  { slug: "latissimus-dorsi",   role: "secondary"  },
  { slug: "biceps-brachii",     role: "secondary"  },
]);

insertExercise("Inverted Rows", [
  { slug: "middle-trapezius",   role: "primary"    },
  { slug: "rhomboids",          role: "primary"    },
  { slug: "latissimus-dorsi",   role: "secondary"  },
  { slug: "biceps-brachii",     role: "secondary"  },
]);

insertExercise("Barbell, Dumbbell or Machine Shrugs", [
  { slug: "upper-trapezius",    role: "primary"    },
  { slug: "middle-trapezius",   role: "secondary"  },
]);

// ── SHOULDERS ───────────────────────────────────────────────────────────────
// Compound shoulder presses also activate triceps secondarily.

insertExercise("Seated Overhead Barbell or Dumbbell Press", [
  { slug: "anterior-deltoid",       role: "primary"    },
  { slug: "lateral-deltoid",        role: "primary"    },
  { slug: "upper-trapezius",        role: "secondary"  },
  { slug: "triceps-long-head",      role: "secondary"  },
  { slug: "triceps-lateral-head",   role: "secondary"  },
]);

insertExercise("Standing Overhead Barbell or Dumbbell Press", [
  { slug: "anterior-deltoid",       role: "primary"    },
  { slug: "lateral-deltoid",        role: "primary"    },
  { slug: "upper-trapezius",        role: "secondary"  },
  { slug: "triceps-long-head",      role: "secondary"  },
  { slug: "triceps-lateral-head",   role: "secondary"  },
  { slug: "erector-spinae",         role: "secondary"  },
]);

insertExercise("Overhead Machine Press", [
  { slug: "anterior-deltoid",       role: "primary"    },
  { slug: "lateral-deltoid",        role: "primary"    },
  { slug: "triceps-long-head",      role: "secondary"  },
  { slug: "triceps-lateral-head",   role: "secondary"  },
]);

insertExercise("Arnold Press", [
  { slug: "anterior-deltoid",       role: "primary"    },
  { slug: "lateral-deltoid",        role: "primary"    },
  { slug: "posterior-deltoid",      role: "primary"    },
  { slug: "triceps-long-head",      role: "secondary"  },
]);

insertExercise("Barbell, Dumbbell or Machine Upright Rows", [
  { slug: "lateral-deltoid",        role: "primary"    },
  { slug: "upper-trapezius",        role: "primary"    },
  { slug: "anterior-deltoid",       role: "secondary"  },
  { slug: "biceps-brachii",         role: "secondary"  },
]);

insertExercise("Dumbbell, Cable or Machine Lateral Raises", [
  { slug: "lateral-deltoid",        role: "primary"    },
]);

insertExercise("Dumbbell, Cable or Machine Front Raises", [
  { slug: "anterior-deltoid",       role: "primary"    },
  { slug: "lateral-deltoid",        role: "secondary"  },
]);

insertExercise("Rear Delt Rows, Raises or Flyes", [
  { slug: "posterior-deltoid",      role: "primary"    },
  { slug: "middle-trapezius",       role: "secondary"  },
  { slug: "rhomboids",              role: "secondary"  },
  { slug: "infraspinatus",          role: "secondary"  },
  { slug: "teres-minor",            role: "secondary"  },
]);

// ── QUADRICEPS ──────────────────────────────────────────────────────────────
// Compound quad exercises also activate the posterior chain secondarily.

insertExercise("Barbell or Dumbbell Squats", [
  { slug: "rectus-femoris",     role: "primary"    },
  { slug: "vastus-lateralis",   role: "primary"    },
  { slug: "vastus-medialis",    role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
  { slug: "adductor-magnus",    role: "secondary"  },
  { slug: "biceps-femoris",     role: "secondary"  },
  { slug: "semitendinosus",     role: "secondary"  },
  { slug: "erector-spinae",     role: "secondary"  },
]);

insertExercise("Barbell or Dumbbell Front Squats", [
  { slug: "rectus-femoris",     role: "primary"    },
  { slug: "vastus-lateralis",   role: "primary"    },
  { slug: "vastus-medialis",    role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
  { slug: "erector-spinae",     role: "secondary"  },
]);

insertExercise("Barbell or Dumbbell Split Squats", [
  { slug: "rectus-femoris",     role: "primary"    },
  { slug: "vastus-lateralis",   role: "primary"    },
  { slug: "vastus-medialis",    role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
  { slug: "adductor-magnus",    role: "secondary"  },
  { slug: "biceps-femoris",     role: "secondary"  },
]);

insertExercise("Barbell or Dumbbell Lunges", [
  { slug: "rectus-femoris",     role: "primary"    },
  { slug: "vastus-lateralis",   role: "primary"    },
  { slug: "vastus-medialis",    role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
  { slug: "adductor-magnus",    role: "secondary"  },
  { slug: "biceps-femoris",     role: "secondary"  },
]);

insertExercise("Barbell or Dumbbell Step-Ups", [
  { slug: "rectus-femoris",     role: "primary"    },
  { slug: "vastus-lateralis",   role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
  { slug: "biceps-femoris",     role: "secondary"  },
]);

insertExercise("Leg Press", [
  { slug: "rectus-femoris",     role: "primary"    },
  { slug: "vastus-lateralis",   role: "primary"    },
  { slug: "vastus-medialis",    role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
  { slug: "adductor-magnus",    role: "secondary"  },
]);

insertExercise("Single Leg Press", [
  { slug: "rectus-femoris",     role: "primary"    },
  { slug: "vastus-lateralis",   role: "primary"    },
  { slug: "vastus-medialis",    role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
]);

insertExercise("Machine Squat / Hack Squat", [
  { slug: "rectus-femoris",     role: "primary"    },
  { slug: "vastus-lateralis",   role: "primary"    },
  { slug: "vastus-medialis",    role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
]);

insertExercise("Leg Extensions", [
  { slug: "rectus-femoris",     role: "primary"    },
  { slug: "vastus-lateralis",   role: "primary"    },
  { slug: "vastus-medialis",    role: "primary"    },
]);

// ── HAMSTRINGS ──────────────────────────────────────────────────────────────

insertExercise("Barbell or Dumbbell Romanian Deadlifts", [
  { slug: "biceps-femoris",     role: "primary"    },
  { slug: "semitendinosus",     role: "primary"    },
  { slug: "semimembranosus",    role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
  { slug: "erector-spinae",     role: "secondary"  },
]);

insertExercise("Barbell or Dumbbell Straight Leg Deadlifts", [
  { slug: "biceps-femoris",     role: "primary"    },
  { slug: "semitendinosus",     role: "primary"    },
  { slug: "semimembranosus",    role: "secondary"  },
  { slug: "gluteus-maximus",    role: "secondary"  },
  { slug: "erector-spinae",     role: "secondary"  },
]);

insertExercise("Barbell or Dumbbell Sumo Deadlifts", [
  { slug: "biceps-femoris",     role: "primary"    },
  { slug: "semitendinosus",     role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
  { slug: "adductor-magnus",    role: "secondary"  },
  { slug: "erector-spinae",     role: "secondary"  },
]);

insertExercise("Glute-Ham Raises", [
  { slug: "biceps-femoris",     role: "primary"    },
  { slug: "semitendinosus",     role: "primary"    },
  { slug: "semimembranosus",    role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
]);

insertExercise("Hyperextensions", [
  { slug: "erector-spinae",     role: "primary"    },
  { slug: "biceps-femoris",     role: "primary"    },
  { slug: "gluteus-maximus",    role: "secondary"  },
  { slug: "semitendinosus",     role: "secondary"  },
]);

insertExercise("Cable Pull-Throughs", [
  { slug: "gluteus-maximus",    role: "primary"    },
  { slug: "biceps-femoris",     role: "primary"    },
  { slug: "semitendinosus",     role: "secondary"  },
  { slug: "semimembranosus",    role: "secondary"  },
]);

insertExercise("Good-Mornings", [
  { slug: "erector-spinae",     role: "primary"    },
  { slug: "biceps-femoris",     role: "primary"    },
  { slug: "semitendinosus",     role: "secondary"  },
  { slug: "gluteus-maximus",    role: "secondary"  },
]);

insertExercise("Leg Curls", [
  { slug: "biceps-femoris",     role: "primary"    },
  { slug: "semitendinosus",     role: "primary"    },
  { slug: "semimembranosus",    role: "primary"    },
]);

// ── BICEPS ──────────────────────────────────────────────────────────────────

insertExercise("Standing Barbell or Dumbbell Curls", [
  { slug: "biceps-brachii",     role: "primary"    },
  { slug: "brachialis",         role: "secondary"  },
  { slug: "brachioradialis",    role: "secondary"  },
]);

insertExercise("Barbell or Dumbbell Preacher Curls", [
  { slug: "biceps-brachii",     role: "primary"    },
  { slug: "brachialis",         role: "secondary"  },
]);

insertExercise("Seated Dumbbell Curls", [
  { slug: "biceps-brachii",     role: "primary"    },
  { slug: "brachialis",         role: "secondary"  },
]);

insertExercise("Incline Dumbbell Curls", [
  { slug: "biceps-brachii",     role: "primary"    },
  { slug: "brachialis",         role: "secondary"  },
]);

// Hammer curls shift emphasis to brachioradialis and brachialis
insertExercise("Hammer Curls", [
  { slug: "brachioradialis",    role: "primary"    },
  { slug: "biceps-brachii",     role: "primary"    },
  { slug: "brachialis",         role: "secondary"  },
]);

insertExercise("Concentration Curls", [
  { slug: "biceps-brachii",     role: "primary"    },
  { slug: "brachialis",         role: "secondary"  },
]);

insertExercise("Cable Curls", [
  { slug: "biceps-brachii",     role: "primary"    },
  { slug: "brachialis",         role: "secondary"  },
]);

insertExercise("Biceps Curl Machine", [
  { slug: "biceps-brachii",     role: "primary"    },
  { slug: "brachialis",         role: "secondary"  },
]);

// ── TRICEPS ──────────────────────────────────────────────────────────────────

// Elbows-close dip variant, no forward lean
insertExercise("Triceps Dips", [
  { slug: "triceps-long-head",      role: "primary"    },
  { slug: "triceps-lateral-head",   role: "primary"    },
  { slug: "pectoralis-major-lower", role: "secondary"  },
  { slug: "anterior-deltoid",       role: "secondary"  },
]);

insertExercise("Flat Close Grip Bench Press", [
  { slug: "triceps-long-head",      role: "primary"    },
  { slug: "triceps-lateral-head",   role: "primary"    },
  { slug: "pectoralis-major-upper", role: "secondary"  },
  { slug: "pectoralis-major-lower", role: "secondary"  },
]);

insertExercise("Decline Close Grip Bench Press", [
  { slug: "triceps-long-head",      role: "primary"    },
  { slug: "triceps-lateral-head",   role: "primary"    },
  { slug: "pectoralis-major-lower", role: "secondary"  },
]);

insertExercise("Close Grip Push-Ups", [
  { slug: "triceps-long-head",      role: "primary"    },
  { slug: "triceps-lateral-head",   role: "primary"    },
  { slug: "pectoralis-major-upper", role: "secondary"  },
  { slug: "pectoralis-major-lower", role: "secondary"  },
]);

insertExercise("Laying Barbell or Dumbbell Triceps Extensions", [
  { slug: "triceps-long-head",      role: "primary"    },
  { slug: "triceps-lateral-head",   role: "primary"    },
]);

insertExercise("Skull Crushers", [
  { slug: "triceps-long-head",      role: "primary"    },
  { slug: "triceps-lateral-head",   role: "primary"    },
]);

// Long head gets greater stretch in the overhead position
insertExercise("Overhead Barbell or Dumbbell Triceps Extensions", [
  { slug: "triceps-long-head",      role: "primary"    },
  { slug: "triceps-lateral-head",   role: "secondary"  },
]);

// Cable press-downs emphasise the lateral head
insertExercise("Cable Press-Downs", [
  { slug: "triceps-lateral-head",   role: "primary"    },
  { slug: "triceps-long-head",      role: "secondary"  },
]);

insertExercise("Bench Dips", [
  { slug: "triceps-long-head",      role: "primary"    },
  { slug: "triceps-lateral-head",   role: "primary"    },
  { slug: "pectoralis-major-lower", role: "secondary"  },
  { slug: "anterior-deltoid",       role: "secondary"  },
]);

// ────────────────────────────────────────────────────────────────────────────

const count = db.select({ id: exercises.id }).from(exercises).all().length;
console.log(`Seeded exercises. Total exercises in DB: ${count}`);
