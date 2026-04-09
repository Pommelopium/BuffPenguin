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
const { FRONT_MUSCLE_MAP, BACK_MUSCLE_MAP, buildCompositeSvg } = require("../shared/svg-builder");

module.exports = NodeHelper.create({
  muscleAssets: null, // cached { front, back } SVG strings, built once on first INIT

  // Called by MM2 when the helper process starts.
  start() {
    console.log("MMM-BuffPenguin node_helper started");
  },

  // Reads a file from disk. Returns null and logs a warning if not found.
  readFile(filePath) {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }
    console.warn(`MMM-BuffPenguin: file not found: ${filePath}`);
    return null;
  },

  // Reads all asset files and builds the front and back composite SVGs.
  // Returns { front: string, back: string } or null on critical error.
  loadMuscleAssets() {
    const assetsDir = path.join(__dirname, "..", "shared", "assets");
    const frontDir = path.join(assetsDir, "front_muscles");
    const backDir = path.join(assetsDir, "back_muscles");

    const frontOutline = this.readFile(path.join(frontDir, "Body black outline.svg"));
    const backOutline  = this.readFile(path.join(backDir,  "Body black outline.svg"));

    if (!frontOutline || !backOutline) {
      console.error("MMM-BuffPenguin: could not load outline SVGs");
      return null;
    }

    const readFileFn = (p) => this.readFile(p);

    return {
      front: buildCompositeSvg(
        frontOutline,
        path.join(frontDir, "each_muscle_group_separate"),
        FRONT_MUSCLE_MAP,
        "front",
        readFileFn
      ),
      back: buildCompositeSvg(
        backOutline,
        path.join(backDir, "each_muscle_group_separate"),
        BACK_MUSCLE_MAP,
        "back",
        readFileFn
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
