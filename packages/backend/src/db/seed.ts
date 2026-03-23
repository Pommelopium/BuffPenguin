import { db } from "./client.js";
import { muscleGroups } from "./schema.js";

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

for (const mg of MUSCLE_GROUPS) {
  db.insert(muscleGroups)
    .values(mg)
    .onConflictDoNothing()
    .run();
}

console.log("Seeded muscle groups.");
