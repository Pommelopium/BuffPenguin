// seed.ts — One-time database seeder for muscle groups.
// Run this once after the first `drizzle-kit push` to populate the
// muscle_groups table. Safe to run multiple times — onConflictDoNothing
// skips rows that already exist, so re-running won't duplicate data.
//
// Usage: npm run db:seed --workspace=packages/backend

import { db } from "./client.js";
import { muscleGroups } from "./schema.js";

// The 50 fine-grained muscle groups supported by the system (25 anterior, 25 posterior).
// The slug must match the id= attribute on the corresponding element in
// packages/mirror-module/assets/muscle-overlay.svg so that the mirror module
// can look up and colour the correct region.
const MUSCLE_GROUPS = [
  // ── Anterior (front) ──────────────────────────────────────────────────────
  { name: "Sternocleidomastoid",       slug: "sternocleidomastoid"       },
  { name: "Pectoralis Major (Upper)",  slug: "pectoralis-major-upper"    },
  { name: "Pectoralis Major (Lower)",  slug: "pectoralis-major-lower"    },
  { name: "Serratus Anterior",         slug: "serratus-anterior"         },
  { name: "Anterior Deltoid",          slug: "anterior-deltoid"          },
  { name: "Lateral Deltoid",           slug: "lateral-deltoid"           },
  { name: "Biceps Brachii",            slug: "biceps-brachii"            },
  { name: "Brachialis",                slug: "brachialis"                },
  { name: "Brachioradialis",           slug: "brachioradialis"           },
  { name: "Forearm Flexors",           slug: "forearm-flexors"           },
  { name: "Rectus Abdominis",          slug: "rectus-abdominis"          },
  { name: "External Obliques",         slug: "external-obliques"         },
  { name: "Internal Obliques",         slug: "internal-obliques"         },
  { name: "Transversus Abdominis",     slug: "transversus-abdominis"     },
  { name: "Iliopsoas",                 slug: "iliopsoas"                 },
  { name: "Tensor Fasciae Latae",      slug: "tensor-fasciae-latae"      },
  { name: "Sartorius",                 slug: "sartorius"                 },
  { name: "Rectus Femoris",            slug: "rectus-femoris"            },
  { name: "Vastus Lateralis",          slug: "vastus-lateralis"          },
  { name: "Vastus Medialis",           slug: "vastus-medialis"           },
  { name: "Adductor Magnus",           slug: "adductor-magnus"           },
  { name: "Adductor Longus",           slug: "adductor-longus"           },
  { name: "Gracilis",                  slug: "gracilis"                  },
  { name: "Tibialis Anterior",         slug: "tibialis-anterior"         },
  { name: "Peroneus Longus",           slug: "peroneus-longus"           },

  // ── Posterior (back) ──────────────────────────────────────────────────────
  { name: "Upper Trapezius",           slug: "upper-trapezius"           },
  { name: "Middle Trapezius",          slug: "middle-trapezius"          },
  { name: "Lower Trapezius",           slug: "lower-trapezius"           },
  { name: "Rhomboids",                 slug: "rhomboids"                 },
  { name: "Posterior Deltoid",         slug: "posterior-deltoid"         },
  { name: "Infraspinatus",             slug: "infraspinatus"             },
  { name: "Teres Minor",               slug: "teres-minor"               },
  { name: "Teres Major",               slug: "teres-major"               },
  { name: "Subscapularis",             slug: "subscapularis"             },
  { name: "Latissimus Dorsi",          slug: "latissimus-dorsi"          },
  { name: "Triceps (Long Head)",       slug: "triceps-long-head"         },
  { name: "Triceps (Lateral Head)",    slug: "triceps-lateral-head"      },
  { name: "Forearm Extensors",         slug: "forearm-extensors"         },
  { name: "Erector Spinae",            slug: "erector-spinae"            },
  { name: "Multifidus",                slug: "multifidus"                },
  { name: "Quadratus Lumborum",        slug: "quadratus-lumborum"        },
  { name: "Gluteus Maximus",           slug: "gluteus-maximus"           },
  { name: "Gluteus Medius",            slug: "gluteus-medius"            },
  { name: "Gluteus Minimus",           slug: "gluteus-minimus"           },
  { name: "Piriformis",                slug: "piriformis"                },
  { name: "Biceps Femoris",            slug: "biceps-femoris"            },
  { name: "Semitendinosus",            slug: "semitendinosus"            },
  { name: "Semimembranosus",           slug: "semimembranosus"           },
  { name: "Gastrocnemius",             slug: "gastrocnemius"             },
  { name: "Soleus",                    slug: "soleus"                    },
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
