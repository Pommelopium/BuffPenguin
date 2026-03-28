/* global module, __dirname */

// node_helper.js — MagicMirror² server-side helper.
// Runs in Node.js (not in the browser renderer). Handles two jobs:
//   1. On INIT, reads all muscle SVG files from assets/, strips their <svg>
//      wrappers, and assembles two composite SVGs (front + back) that the
//      browser module injects as innerHTML. Each muscle group gets a <g id="slug">
//      wrapper so CSS freshness classes can target it.
//   2. Fetches freshness data from the BuffPenguin backend on each poll
//      interval and forwards the result to the browser module.

const NodeHelper = require("node_helper"); // external: MagicMirror² base class for server-side helpers
const path = require("path");              // external: Node.js built-in path utilities
const fs = require("fs");                  // external: Node.js built-in filesystem access

// Maps SVG filenames in front_muscles/each_muscle_group_separate/ to API slugs.
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

module.exports = NodeHelper.create({
  muscleAssets: null, // cached { front, back } SVG strings, built once on first INIT

  // Called by MM2 when the helper process starts.
  start() {
    console.log("MMM-BuffPenguin node_helper started");
  },

  // Strips the XML declaration, SVG comments, and outer <svg> wrapper from a
  // raw SVG file, returning only the inner content as a string.
  extractSvgInner(content) {
    return content
      .replace(/<\?xml[^>]+\?>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "")
      .trim();
  },

  // Processes a body outline SVG. Keeps the <style> block (for body shading)
  // but renames all .stX class names to .outline-stX to prevent collisions
  // when multiple SVGs are inlined in the same document.
  processOutline(content, side) {
    let inner = this.extractSvgInner(content);
    const prefix = `outline-${side}-`;
    // Rename class names in the <style> block
    inner = inner.replace(/\.st(\d+)\s*\{/g, `.${prefix}st$1 {`);
    // Rename class attributes on path/g elements
    inner = inner.replace(/\bclass="st(\d+)"/g, `class="${prefix}st$1"`);
    return `<g class="bp-outline bp-outline-${side}">${inner}</g>`;
  },

  // Processes a single muscle SVG. Strips its <style> block so that path
  // fills are unset and inherit the fill colour set on the parent <g> by
  // the CSS freshness classes (.muscle-region.today, etc.).
  processMuscle(content, slug) {
    let inner = this.extractSvgInner(content);
    inner = inner.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
    return `<g id="${slug}" class="muscle-region">${inner.trim()}</g>`;
  },

  // Reads a file from disk. Returns null and logs a warning if not found.
  readFile(filePath) {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }
    console.warn(`MMM-BuffPenguin: file not found: ${filePath}`);
    return null;
  },

  // Assembles a composite SVG: one outline layer + one <g> per muscle group.
  // All source SVGs share viewBox "0 0 432 648", so they stack precisely.
  buildCompositeSvg(outlineContent, muscleDir, muscleMap, side) {
    const outlineGroup = this.processOutline(outlineContent, side);
    const muscleGroups = muscleMap
      .map(({ file, slug }) => {
        const content = this.readFile(path.join(muscleDir, file));
        return content ? this.processMuscle(content, slug) : "";
      })
      .filter(Boolean)
      .join("\n");

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 648" class="bp-anatomy-svg bp-anatomy-${side}">`,
      outlineGroup,
      muscleGroups,
      `</svg>`,
    ].join("\n");
  },

  // Reads all asset files and builds the front and back composite SVGs.
  // Returns { front: string, back: string } or null on critical error.
  loadMuscleAssets() {
    const assetsDir = path.join(__dirname, "assets");
    const frontDir = path.join(assetsDir, "front_muscles");
    const backDir = path.join(assetsDir, "back_muscles");

    const frontOutline = this.readFile(path.join(frontDir, "Body black outline.svg"));
    const backOutline  = this.readFile(path.join(backDir,  "Body black outline.svg"));

    if (!frontOutline || !backOutline) {
      console.error("MMM-BuffPenguin: could not load outline SVGs");
      return null;
    }

    return {
      front: this.buildCompositeSvg(
        frontOutline,
        path.join(frontDir, "each_muscle_group_separate"),
        FRONT_MUSCLE_MAP,
        "front"
      ),
      back: this.buildCompositeSvg(
        backOutline,
        path.join(backDir, "each_muscle_group_separate"),
        BACK_MUSCLE_MAP,
        "back"
      ),
    };
  },

  // Receives socket notifications from the browser-side MMM-BuffPenguin.js module.
  socketNotificationReceived(notification, payload) {
    if (notification === "INIT") {
      // Build composite SVGs once and cache; subsequent INIT calls reuse the cache.
      if (!this.muscleAssets) {
        this.muscleAssets = this.loadMuscleAssets();
      }
      this.sendSocketNotification("MUSCLE_ASSETS", this.muscleAssets); // external: MM2 socket bridge
    } else if (notification === "FETCH_FRESHNESS") {
      this.fetchFreshness(payload);
    }
  },

  // Fetches the /muscle-groups/freshness endpoint from the BuffPenguin backend.
  async fetchFreshness({ backendUrl, lookbackDays }) {
    try {
      const url = `${backendUrl}/api/v1/muscle-groups/freshness?days=${lookbackDays}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) }); // external: native Node.js fetch
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.sendSocketNotification("FRESHNESS_DATA", data); // external: MM2 socket bridge
    } catch (err) {
      this.sendSocketNotification("FRESHNESS_ERROR", err.message); // external: MM2 socket bridge
    }
  },
});
