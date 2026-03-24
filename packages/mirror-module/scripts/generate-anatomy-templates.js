// generate-anatomy-templates.js
// Creates empty SVG template files for every muscle group in both the
// male and female anatomy folders. Run once during initial setup:
//
//   node packages/mirror-module/scripts/generate-anatomy-templates.js
//
// Files that already exist are NOT overwritten, so it is safe to re-run
// after you have filled in artwork for some muscles.

import { mkdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, "..", "assets", "anatomy");

// ── Muscle group catalogue ───────────────────────────────────────────────────
const MUSCLES = [
  // Anterior (front)
  { slug: "sternocleidomastoid",    name: "Sternocleidomastoid",       side: "anterior" },
  { slug: "pectoralis-major-upper", name: "Pectoralis Major (Upper)",  side: "anterior" },
  { slug: "pectoralis-major-lower", name: "Pectoralis Major (Lower)",  side: "anterior" },
  { slug: "serratus-anterior",      name: "Serratus Anterior",         side: "anterior" },
  { slug: "anterior-deltoid",       name: "Anterior Deltoid",          side: "anterior" },
  { slug: "lateral-deltoid",        name: "Lateral Deltoid",           side: "anterior" },
  { slug: "biceps-brachii",         name: "Biceps Brachii",            side: "anterior" },
  { slug: "brachialis",             name: "Brachialis",                side: "anterior" },
  { slug: "brachioradialis",        name: "Brachioradialis",           side: "anterior" },
  { slug: "forearm-flexors",        name: "Forearm Flexors",           side: "anterior" },
  { slug: "rectus-abdominis",       name: "Rectus Abdominis",          side: "anterior" },
  { slug: "external-obliques",      name: "External Obliques",         side: "anterior" },
  { slug: "internal-obliques",      name: "Internal Obliques",         side: "anterior" },
  { slug: "transversus-abdominis",  name: "Transversus Abdominis",     side: "anterior" },
  { slug: "iliopsoas",              name: "Iliopsoas",                 side: "anterior" },
  { slug: "tensor-fasciae-latae",   name: "Tensor Fasciae Latae",      side: "anterior" },
  { slug: "sartorius",              name: "Sartorius",                 side: "anterior" },
  { slug: "rectus-femoris",         name: "Rectus Femoris",            side: "anterior" },
  { slug: "vastus-lateralis",       name: "Vastus Lateralis",          side: "anterior" },
  { slug: "vastus-medialis",        name: "Vastus Medialis",           side: "anterior" },
  { slug: "adductor-magnus",        name: "Adductor Magnus",           side: "anterior" },
  { slug: "adductor-longus",        name: "Adductor Longus",           side: "anterior" },
  { slug: "gracilis",               name: "Gracilis",                  side: "anterior" },
  { slug: "tibialis-anterior",      name: "Tibialis Anterior",         side: "anterior" },
  { slug: "peroneus-longus",        name: "Peroneus Longus",           side: "anterior" },
  // Posterior (back)
  { slug: "upper-trapezius",        name: "Upper Trapezius",           side: "posterior" },
  { slug: "middle-trapezius",       name: "Middle Trapezius",          side: "posterior" },
  { slug: "lower-trapezius",        name: "Lower Trapezius",           side: "posterior" },
  { slug: "rhomboids",              name: "Rhomboids",                 side: "posterior" },
  { slug: "posterior-deltoid",      name: "Posterior Deltoid",         side: "posterior" },
  { slug: "infraspinatus",          name: "Infraspinatus",             side: "posterior" },
  { slug: "teres-minor",            name: "Teres Minor",               side: "posterior" },
  { slug: "teres-major",            name: "Teres Major",               side: "posterior" },
  { slug: "subscapularis",          name: "Subscapularis",             side: "posterior" },
  { slug: "latissimus-dorsi",       name: "Latissimus Dorsi",          side: "posterior" },
  { slug: "triceps-long-head",      name: "Triceps (Long Head)",       side: "posterior" },
  { slug: "triceps-lateral-head",   name: "Triceps (Lateral Head)",    side: "posterior" },
  { slug: "forearm-extensors",      name: "Forearm Extensors",         side: "posterior" },
  { slug: "erector-spinae",         name: "Erector Spinae",            side: "posterior" },
  { slug: "multifidus",             name: "Multifidus",                side: "posterior" },
  { slug: "quadratus-lumborum",     name: "Quadratus Lumborum",        side: "posterior" },
  { slug: "gluteus-maximus",        name: "Gluteus Maximus",           side: "posterior" },
  { slug: "gluteus-medius",         name: "Gluteus Medius",            side: "posterior" },
  { slug: "gluteus-minimus",        name: "Gluteus Minimus",           side: "posterior" },
  { slug: "piriformis",             name: "Piriformis",                side: "posterior" },
  { slug: "biceps-femoris",         name: "Biceps Femoris",            side: "posterior" },
  { slug: "semitendinosus",         name: "Semitendinosus",            side: "posterior" },
  { slug: "semimembranosus",        name: "Semimembranosus",           side: "posterior" },
  { slug: "gastrocnemius",          name: "Gastrocnemius",             side: "posterior" },
  { slug: "soleus",                 name: "Soleus",                    side: "posterior" },
];

// ── SVG template builders ────────────────────────────────────────────────────

function silhouetteTemplate(sex) {
  const label = sex === "male" ? "Male" : "Female";
  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  silhouette.svg — ${label} body outline
  =========================================
  Draw the full body silhouette (front and back view) here.

  Coordinate system (viewBox 0 0 240 400):
    Anterior (front) figure: centred at x=60  (x range ~10–110)
    Posterior (back)  figure: centred at x=180 (x range ~130–230)

  Style: use fill="none" stroke="#aaaaaa" stroke-width="1" for outline only.
  No id or class attributes needed — this layer is purely decorative.
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 400">
  <!-- Replace this comment with your body outline paths -->
</svg>
`;
}

function muscleTemplate(slug, name, side, sex) {
  const label = sex === "male" ? "Male" : "Female";
  const pos = side === "anterior"
    ? "Anterior figure: centred at x=60 (x range ~10–110)"
    : "Posterior figure: centred at x=180 (x range ~130–230)";
  const bilateral = `For bilateral muscles draw both sides as two subpaths:
  <path id="${slug}" class="muscle-region" d="M [left] Z  M [right] Z"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  ${slug}.svg — ${label} ${name}
  ${"=".repeat(slug.length + name.length + label.length + 9)}
  Draw the ${name} muscle region here.

  Coordinate system (viewBox 0 0 240 400):
    ${pos}

  Requirements:
    - The path element must have id="${slug}" and class="muscle-region"
    - Use fill="none" — border colour is applied by MMM-BuffPenguin.css
    - ${bilateral}
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 400">
  <!-- Replace this comment with your muscle path -->
  <!-- <path id="${slug}" class="muscle-region" d=""/> -->
</svg>
`;
}

// ── File generation ──────────────────────────────────────────────────────────

let created = 0;
let skipped = 0;

for (const sex of ["male", "female"]) {
  const dir = join(ASSETS_DIR, sex);
  mkdirSync(dir, { recursive: true });

  // Silhouette
  const silPath = join(dir, "silhouette.svg");
  if (!existsSync(silPath)) {
    writeFileSync(silPath, silhouetteTemplate(sex), "utf8");
    console.log(`  created  ${sex}/silhouette.svg`);
    created++;
  } else {
    console.log(`  skipped  ${sex}/silhouette.svg (already exists)`);
    skipped++;
  }

  // One file per muscle
  for (const { slug, name, side } of MUSCLES) {
    const filePath = join(dir, `${slug}.svg`);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, muscleTemplate(slug, name, side, sex), "utf8");
      console.log(`  created  ${sex}/${slug}.svg`);
      created++;
    } else {
      console.log(`  skipped  ${sex}/${slug}.svg (already exists)`);
      skipped++;
    }
  }
}

console.log(`\nDone. ${created} file(s) created, ${skipped} skipped.`);
