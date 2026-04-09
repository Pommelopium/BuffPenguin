// svg-builder.js — Shared SVG composition logic.
// Used by both node_helper.js (MagicMirror²) and build-web-svgs.js (web app build).

// Maps SVG filenames in front_muscles/each_muscle_group_separate/ to API slugs.
// Missing front slugs (no SVG file available):
//   - pectoralis-major-lower
//   - lateral-deltoid
//   - internal-obliques
//   - transversus-abdominis
//   - iliopsoas
//   - adductor-magnus (front view)
//   - tibialis-anterior
const FRONT_MUSCLE_MAP = [
  { file: "Adductor Longus and Pectineus.svg", slug: "adductor-longus"        },
  { file: "Biceps brachii.svg",                slug: "biceps-brachii"          },
  { file: "Brachialis.svg",                    slug: "brachialis"              },
  { file: "Brachioradialis.svg",               slug: "brachioradialis"         },
  { file: "Deltoids.svg",                      slug: "anterior-deltoid"        },
  { file: "External obliques.svg",             slug: "external-obliques"       },
  { file: "Flexor carpi radialis.svg",         slug: "forearm-flexors"         },
  { file: "Gastrocnemius (calf).svg",          slug: "gastrocnemius"           },
  { file: "Omohyoid.svg",                      slug: "sternocleidomastoid"     },
  { file: "Pectoralis Major.svg",              slug: "pectoralis-major-upper"  },
  { file: "Peroneus longus.svg",               slug: "peroneus-longus"         },
  { file: "Rectus Abdominus.svg",              slug: "rectus-abdominis"        },
  { file: "Rectus femoris.svg",                slug: "rectus-femoris"          },
  { file: "Sartorius.svg",                     slug: "sartorius"               },
  { file: "Serratus Anterior.svg",             slug: "serratus-anterior"       },
  { file: "Soleus.svg",                        slug: "soleus"                  },
  { file: "Sternocleidomastoid.svg",           slug: "sternocleidomastoid"     },
  { file: "Tensor fasciae latae.svg",          slug: "tensor-fasciae-latae"    },
  { file: "Trapezius.svg",                     slug: "upper-trapezius"         },
  { file: "Triceps brachii, long head.svg",    slug: "triceps-long-head"       },
  { file: "Triceps brachii, medial head.svg",  slug: "triceps-lateral-head"    },
  { file: "Vastus Lateralis.svg",              slug: "vastus-lateralis"        },
  { file: "Vastus Medialis.svg",               slug: "vastus-medialis"         },
];

// Maps SVG filenames in back_muscles/each_muscle_group_separate/ to API slugs.
// Missing back slugs (no SVG file available):
//   - middle-trapezius
//   - teres-minor
//   - subscapularis
//   - triceps-lateral-head (back view)
//   - multifidus
//   - quadratus-lumborum
//   - gluteus-minimus
//   - piriformis
//   - semimembranosus
//   - soleus (back view)
const BACK_MUSCLE_MAP = [
  { file: "Adductor magnus.svg",                             slug: "adductor-magnus"      },
  { file: "Biceps fermoris.svg",                             slug: "biceps-femoris"        },
  { file: "Brachioradialis.svg",                             slug: "brachioradialis"       },
  { file: "Deltoids.svg",                                    slug: "posterior-deltoid"     },
  { file: "Extensor carpi radialis.svg",                     slug: "forearm-extensors"     },
  { file: "External obliques.svg",                           slug: "external-obliques"     },
  { file: "Gastrocnemius, lateral head.svg",                 slug: "gastrocnemius"         },
  { file: "Gluteus maximus.svg",                             slug: "gluteus-maximus"       },
  { file: "Gluteus medius.svg",                              slug: "gluteus-medius"        },
  { file: "Gracilis.svg",                                    slug: "gracilis"              },
  { file: "Infraspinatus.svg",                               slug: "infraspinatus"         },
  { file: "Lattisimus dorsi.svg",                            slug: "latissimus-dorsi"      },
  { file: "Lower Trapezius.svg",                             slug: "lower-trapezius"       },
  { file: "Peroneus longus.svg",                             slug: "peroneus-longus"       },
  { file: "Rhomboid major.svg",                              slug: "rhomboids"             },
  { file: "Semitendinosus.svg",                              slug: "semitendinosus"        },
  { file: "Serratus Anterior.svg",                           slug: "serratus-anterior"     },
  { file: "Tensor fascie latae.svg",                         slug: "tensor-fasciae-latae"  },
  { file: "Teres major.svg",                                 slug: "teres-major"           },
  { file: "Thoracolumbar fascia.svg",                        slug: "erector-spinae"        },
  { file: "Trapezius.svg",                                   slug: "upper-trapezius"       },
  { file: "Triceps Brachii ( long head, lateral head ).svg", slug: "triceps-long-head"     },
];

// Strips XML declaration, comments, and outer <svg> wrapper.
function extractSvgInner(content) {
  return content
    .replace(/<\?xml[^>]+\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();
}

// Processes a body outline SVG — strips styles and class attributes.
function processOutline(content, side) {
  let inner = extractSvgInner(content);
  inner = inner.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
  inner = inner.replace(/\s+class="[^"]*"/g, "");
  return `<g class="bp-outline bp-outline-${side}">${inner.trim()}</g>`;
}

// Processes a single muscle SVG — strips styles, wraps in a <g> with id and class.
function processMuscle(content, slug) {
  let inner = extractSvgInner(content);
  inner = inner.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
  return `<g id="${slug}" class="muscle-region">${inner.trim()}</g>`;
}

// Assembles a composite SVG from an outline and muscle groups.
// readFileFn(filePath) should return file content as string, or null if not found.
function buildCompositeSvg(outlineContent, muscleDir, muscleMap, side, readFileFn) {
  const outlineGroup = processOutline(outlineContent, side);
  const muscleGroups = muscleMap
    .map(({ file, slug }) => {
      const content = readFileFn(muscleDir + "/" + file);
      return content ? processMuscle(content, slug) : "";
    })
    .filter(Boolean)
    .join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 648" class="bp-anatomy-svg bp-anatomy-${side}">`,
    outlineGroup,
    muscleGroups,
    `</svg>`,
  ].join("\n");
}

module.exports = {
  FRONT_MUSCLE_MAP,
  BACK_MUSCLE_MAP,
  extractSvgInner,
  processOutline,
  processMuscle,
  buildCompositeSvg,
};
