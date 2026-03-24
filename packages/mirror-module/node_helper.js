/* global module, __dirname */

// node_helper.js — MagicMirror² server-side helper.
// Runs in Node.js (not in the browser renderer). Handles two jobs:
//   1. Loads the correct muscle-overlay SVG from disk on INIT (male or female
//      depending on the anatomySex config option) and sends it to the browser.
//   2. Fetches freshness data from the BuffPenguin backend on each poll
//      interval and forwards the result to the browser module.
//
// This split exists because MagicMirror²'s security model prevents the
// browser-side module from making arbitrary HTTP requests directly.

const NodeHelper = require("node_helper"); // external: MagicMirror² base class for server-side helpers
const path = require("path");              // external: Node.js built-in path utilities
const fs = require("fs");                  // external: Node.js built-in filesystem access

module.exports = NodeHelper.create({
  svgContent: null, // cached SVG string, loaded on first INIT from the browser module

  // Called by MM2 when the helper process starts.
  start() {
    console.log("MMM-BuffPenguin node_helper started");
  },

  // Reads the muscle overlay SVG from the assets folder.
  // Selects the male or female variant based on the anatomySex config option.
  // Falls back to a minimal error SVG if the file hasn't been created yet.
  loadSvg(anatomySex) {
    const filename = anatomySex === "female"
      ? "muscle-overlay-female.svg"
      : "muscle-overlay.svg";
    const svgPath = path.join(__dirname, "assets", filename); // reads from local filesystem
    if (fs.existsSync(svgPath)) {
      this.svgContent = fs.readFileSync(svgPath, "utf8"); // reads entire SVG file into memory
    } else {
      console.warn(`MMM-BuffPenguin: ${filename} not found at`, svgPath);
      this.svgContent = this.getFallbackSvg(); // use inline placeholder instead
    }
  },

  // Receives socket notifications from the browser-side MMM-BuffPenguin.js module.
  // INIT: browser module has loaded — load the correct SVG and send it immediately.
  // FETCH_FRESHNESS: interval fired — fetch new data from the backend and send it back.
  socketNotificationReceived(notification, payload) {
    if (notification === "INIT") {
      // Load the SVG for the configured anatomy sex, then send it to the browser module.
      // The browser module injects it as innerHTML so CSS can target individual paths.
      this.loadSvg(payload.anatomySex);
      this.sendSocketNotification("SVG_CONTENT", this.svgContent); // external: MM2 socket bridge
    } else if (notification === "FETCH_FRESHNESS") {
      this.fetchFreshness(payload);
    }
  },

  // Fetches the /muscle-groups/freshness endpoint from the BuffPenguin backend.
  // Uses the native fetch API (available in Node.js 18+) with a 5-second
  // timeout so a slow or unreachable Pi doesn't block the helper indefinitely.
  async fetchFreshness({ backendUrl, lookbackDays }) {
    try {
      const url = `${backendUrl}/api/v1/muscle-groups/freshness?days=${lookbackDays}`;
      // external: native Node.js fetch — makes HTTP GET to the BuffPenguin backend
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      // Forward the freshness payload to the browser module to update the SVG classes.
      this.sendSocketNotification("FRESHNESS_DATA", data); // external: MM2 socket bridge
    } catch (err) {
      // Notify the browser module so it can log the error.
      // The browser module keeps showing the last known data rather than blanking.
      this.sendSocketNotification("FRESHNESS_ERROR", err.message); // external: MM2 socket bridge
    }
  },

  // Returns a minimal SVG shown when the overlay file hasn't been created yet.
  // Visible only during initial setup before the Inkscape refinement is done.
  getFallbackSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400" class="bp-svg-fallback">
      <text x="100" y="200" text-anchor="middle" fill="#888" font-size="14">
        muscle-overlay.svg not found
      </text>
    </svg>`;
  },
});
