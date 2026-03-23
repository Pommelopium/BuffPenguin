/* global module, __dirname */
const NodeHelper = require("node_helper");
const path = require("path");
const fs = require("fs");

module.exports = NodeHelper.create({
  svgContent: null,

  start() {
    console.log("MMM-BuffPenguin node_helper started");
    this.loadSvg();
  },

  loadSvg() {
    const svgPath = path.join(__dirname, "assets", "muscle-overlay.svg");
    if (fs.existsSync(svgPath)) {
      this.svgContent = fs.readFileSync(svgPath, "utf8");
    } else {
      console.warn("MMM-BuffPenguin: muscle-overlay.svg not found at", svgPath);
      this.svgContent = this.getFallbackSvg();
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "INIT") {
      // Send the SVG content to the browser module
      this.sendSocketNotification("SVG_CONTENT", this.svgContent);
    } else if (notification === "FETCH_FRESHNESS") {
      this.fetchFreshness(payload);
    }
  },

  async fetchFreshness({ backendUrl, lookbackDays }) {
    try {
      const url = `${backendUrl}/api/v1/muscle-groups/freshness?days=${lookbackDays}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.sendSocketNotification("FRESHNESS_DATA", data);
    } catch (err) {
      this.sendSocketNotification("FRESHNESS_ERROR", err.message);
    }
  },

  // Minimal inline SVG fallback if the overlay file hasn't been created yet
  getFallbackSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400" class="bp-svg-fallback">
      <text x="100" y="200" text-anchor="middle" fill="#888" font-size="14">
        muscle-overlay.svg not found
      </text>
    </svg>`;
  },
});
