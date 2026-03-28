# MMM-BuffPenguin — Mirror Module

MagicMirror² module that displays which muscle groups you have trained recently, colour-coded by how long ago you last worked them. Two anatomical body figures (front and back view) are shown side by side. Each muscle region lights up based on freshness data from the BuffPenguin backend.

---

## Files

```
packages/mirror-module/
  MMM-BuffPenguin.js      — browser-side module (DOM, freshness classes)
  node_helper.js          — server-side helper (SVG assembly, HTTP polling)
  MMM-BuffPenguin.css     — all visual styling
  assets/
    front_muscles/
      Body black outline.svg              — body silhouette, anterior view
      each_muscle_group_separate/*.svg    — one SVG per anterior muscle
    back_muscles/
      Body black outline.svg              — body silhouette, posterior view
      each_muscle_group_separate/*.svg    — one SVG per posterior muscle
```

---

## How it works

### 1. Startup — SVG assembly (node_helper.js)

When MagicMirror² starts, `node_helper.js` receives an `INIT` socket notification from the browser module. It then:

1. Reads `Body black outline.svg` from both `front_muscles/` and `back_muscles/`.
2. Reads each individual muscle SVG listed in `FRONT_MUSCLE_MAP` / `BACK_MUSCLE_MAP`.
3. Assembles two composite SVGs — one for the front view, one for the back view.
4. Sends both SVG strings to the browser module as a `MUSCLE_ASSETS` notification.

This assembly happens once and is cached for the lifetime of the MM2 process.

### 2. SVG assembly detail

All source SVGs (outline and muscle) share `viewBox="0 0 432 648"`, so their paths stack pixel-perfectly when combined.

**Body outline** (`processOutline`):
- Strips the XML declaration, comments, and outer `<svg>` tag.
- Strips the embedded Illustrator `<style>` block and all `class` attributes from paths.
  - This is critical: embedded `<style>` blocks always override external CSS. Stripping them lets the CSS file control the fill via inheritance.
- Wraps everything in `<g class="bp-outline bp-outline-front">` (or `back`).
- CSS sets `fill: rgba(255,255,255,0.3)` on `.bp-outline` — paths with no explicit fill inherit this, producing the semi-transparent white silhouette.

**Each muscle** (`processMuscle`):
- Same stripping of XML wrapper and embedded `<style>` block.
- Wraps in `<g id="[slug]" class="muscle-region">`.
- Paths have no explicit fill so they inherit from the parent `<g>`.
- Default CSS sets `fill: transparent` — invisible until a freshness class is added.

**Composite SVG** (`buildCompositeSvg`):
```
<svg viewBox="0 0 432 648" class="bp-anatomy-svg bp-anatomy-front">
  <g class="bp-outline bp-outline-front">  <!-- body silhouette paths -->
  <g id="biceps-brachii" class="muscle-region">  <!-- muscle paths -->
  <g id="rectus-femoris" class="muscle-region">
  ...
</svg>
```

### 3. Rendering (MMM-BuffPenguin.js)

The browser module injects both SVG strings as `innerHTML` into two `<div class="bp-figure-wrap">` elements, placed side by side inside `.bp-figures`. Injecting as innerHTML makes the browser create real SVG DOM nodes, which is required for `querySelectorAll` to find muscle `<g>` elements by id.

### 4. Freshness polling

On startup and every `updateInterval` milliseconds, the browser module sends a `FETCH_FRESHNESS` notification to the helper. The helper calls:

```
GET {backendUrl}/api/v1/muscle-groups/freshness?days={lookbackDays}
```

The backend returns a list of `{ slug, freshness }` objects where `freshness` is one of: `today`, `recent`, `moderate`, `stale`, `untrained`.

### 5. Applying freshness colours (applyFreshness)

For each `{ slug, freshness }` in the response, the browser module runs:

```js
container.querySelectorAll(`[id="${slug}"]`).forEach(el => {
  el.classList.add(freshness);
});
```

This targets every `<g id="[slug]">` in both SVGs simultaneously (muscles like `brachioradialis` appear on both front and back). CSS then picks up the class and applies the fill colour.

---

## CSS classes and colours

### Body outline

| Class | Applied to | Effect |
|---|---|---|
| `.bp-outline` | `<g>` wrapping body outline paths | `fill: rgba(255,255,255,0.3)` — semi-transparent white silhouette |

### Muscle regions

| Class | Meaning | Fill colour |
|---|---|---|
| `.muscle-region` | Default (no data) | `transparent` |
| `.muscle-region.today` | Trained today | `#00ff88` (bright green) |
| `.muscle-region.recent` | Trained 1–3 days ago | `#88ff44` (yellow-green) |
| `.muscle-region.moderate` | Trained 4–6 days ago | `#ffaa00` (amber) |
| `.muscle-region.stale` | Trained 7+ days ago | `#ff4444` (red) |
| `.muscle-region.untrained` | No data in lookback window | `#333333` at 40% opacity |

---

## Muscle-to-SVG file mapping

The maps in `node_helper.js` link each SVG filename to its API slug. Not every slug in the database has a dedicated SVG — unmapped slugs simply receive no visual region.

### Front muscles (23 mapped)

| SVG filename | Slug |
|---|---|
| Adductor Longus and Pectineus.svg | adductor-longus |
| Biceps brachii.svg | biceps-brachii |
| Brachialis.svg | brachialis |
| Brachioradialis.svg | brachioradialis |
| Deltoids.svg | anterior-deltoid |
| External obliques.svg | external-obliques |
| Flexor carpi radialis.svg | forearm-flexors |
| Gastrocnemius (calf).svg | gastrocnemius |
| Omohyoid.svg | sternocleidomastoid |
| Pectoralis Major.svg | pectoralis-major-upper |
| Peroneus longus.svg | peroneus-longus |
| Rectus Abdominus.svg | rectus-abdominis |
| Rectus femoris.svg | rectus-femoris |
| Sartorius.svg | sartorius |
| Serratus Anterior.svg | serratus-anterior |
| Soleus.svg | soleus |
| Sternocleidomastoid.svg | sternocleidomastoid |
| Tensor fasciae latae.svg | tensor-fasciae-latae |
| Trapezius.svg | upper-trapezius |
| Triceps brachii, long head.svg | triceps-long-head |
| Triceps brachii, medial head.svg | triceps-lateral-head |
| Vastus Lateralis.svg | vastus-lateralis |
| Vastus Medialis.svg | vastus-medialis |

### Back muscles (22 mapped)

| SVG filename | Slug |
|---|---|
| Adductor magnus.svg | adductor-magnus |
| Biceps fermoris.svg | biceps-femoris |
| Brachioradialis.svg | brachioradialis |
| Deltoids.svg | posterior-deltoid |
| Extensor carpi radialis.svg | forearm-extensors |
| External obliques.svg | external-obliques |
| Gastrocnemius, lateral head.svg | gastrocnemius |
| Gluteus maximus.svg | gluteus-maximus |
| Gluteus medius.svg | gluteus-medius |
| Gracilis.svg | gracilis |
| Infraspinatus.svg | infraspinatus |
| Lattisimus dorsi.svg | latissimus-dorsi |
| Lower Trapezius.svg | lower-trapezius |
| Peroneus longus.svg | peroneus-longus |
| Rhomboid major.svg | rhomboids |
| Semitendinosus.svg | semitendinosus |
| Serratus Anterior.svg | serratus-anterior |
| Tensor fascie latae.svg | tensor-fasciae-latae |
| Teres major.svg | teres-major |
| Thoracolumbar fascia.svg | erector-spinae |
| Trapezius.svg | upper-trapezius |
| Triceps Brachii ( long head, lateral head ).svg | triceps-long-head |

---

## Adding a new muscle region

1. Add the SVG file to `assets/front_muscles/each_muscle_group_separate/` or `assets/back_muscles/each_muscle_group_separate/`.
2. Add an entry to `FRONT_MUSCLE_MAP` or `BACK_MUSCLE_MAP` in `node_helper.js`:
   ```js
   { file: "My Muscle.svg", slug: "my-muscle-slug" },
   ```
3. Make sure the slug exists in the database (`muscle_groups` table). Run `npm run db:seed --workspace=packages/backend` if you added it there, or insert it via the API.
4. Restart MagicMirror².

---

## Socket notifications

| Direction | Notification | Payload | Description |
|---|---|---|---|
| Browser → Helper | `INIT` | `{ backendUrl, lookbackDays }` | Triggers SVG assembly on first call |
| Helper → Browser | `MUSCLE_ASSETS` | `{ front: string, back: string }` | The assembled SVG strings |
| Browser → Helper | `FETCH_FRESHNESS` | `{ backendUrl, lookbackDays }` | Poll the backend |
| Helper → Browser | `FRESHNESS_DATA` | `{ groups: [{ slug, freshness }] }` | Freshness data from backend |
| Helper → Browser | `FRESHNESS_ERROR` | error message string | Logged, display unchanged |

---

## Config options (config/config.js)

```js
{
  module: "MMM-BuffPenguin",
  position: "bottom_left",
  config: {
    backendUrl: "http://localhost:3000",  // BuffPenguin backend URL
    updateInterval: 60000,               // freshness poll interval in ms (default: 60s)
    lookbackDays: 14,                    // how many days of history to consider
  }
}
```

---

## Known design decisions

- **Embedded SVG `<style>` blocks are always stripped.** Illustrator exports include a `<style>` block that sets fills directly on paths. These inline styles override any external CSS, including CSS filters. Stripping them and letting paths inherit fill from their parent `<g>` is the only reliable way to control colour from an external stylesheet.
- **No pre-built composite SVG.** The composite SVGs are built at runtime in `node_helper.js` from the individual asset files. This avoids a build step and makes it easy to add or swap muscle SVGs — just drop a file in the folder and update the map.
- **Both figures share one freshness query.** A muscle like `gastrocnemius` or `brachioradialis` appears in both the front and back maps. `querySelectorAll` finds all matching `id` attributes across both SVGs, so the colour is applied to both views at once.
