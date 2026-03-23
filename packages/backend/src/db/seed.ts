// seed.ts — One-time database seeder for muscle groups.
// Run this once after the first `drizzle-kit push` to populate the
// muscle_groups table. Safe to run multiple times — onConflictDoNothing
// skips rows that already exist, so re-running won't duplicate data.
//
// Usage: npm run db:seed --workspace=packages/backend

import { db } from "./client.js";
import { muscleGroups } from "./schema.js";

// The 11 muscle groups supported by the system.
// The slug must match the id= attribute on the corresponding <path>
// element in packages/mirror-module/assets/muscle-overlay.svg so that
// the mirror module can look up and colour the correct region.
const MUSCLE_GROUPS = [
  { name: "Neck",        slug: "neck"        },
  { name: "Chest",       slug: "chest"       },
  { name: "Shoulders",   slug: "shoulders"   },
  { name: "Biceps",      slug: "biceps"      },
  { name: "Forearms",    slug: "forearms"    },
  { name: "Thighs",      slug: "thighs"      },
  { name: "Calves",      slug: "calves"      },
  { name: "Back",        slug: "back"        },
  { name: "Triceps",     slug: "triceps"     },
  { name: "Glutes",      slug: "glutes"      },
  { name: "Hamstrings",  slug: "hamstrings"  },
];

// Insert each muscle group. onConflictDoNothing means if the unique
// constraint on `name` or `slug` fires, the row is silently skipped.
for (const mg of MUSCLE_GROUPS) {
  db.insert(muscleGroups)  // writes to DB via better-sqlite3 (synchronous)
    .values(mg)
    .onConflictDoNothing()
    .run();
}

console.log("Seeded muscle groups.");
