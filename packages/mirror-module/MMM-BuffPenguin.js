/* global Module, Log */

// MMM-BuffPenguin.js — MagicMirror² browser-side module.
// Runs inside the MagicMirror² Electron/Chromium renderer process.
// Responsible for building the DOM (SVG figure + legend) and applying
// CSS freshness classes to muscle region paths based on data from the backend.
//
// Communication with the backend happens indirectly via node_helper.js:
// this module sends socket notifications to the helper, which performs
// the actual HTTP fetch and sends the result back.

Module.register("MMM-BuffPenguin", {
  defaults: {
    backendUrl: "http://localhost:3000", // backend address; localhost works when both run on the same Pi
    updateInterval: 60 * 1000,           // how often to re-poll the freshness endpoint (milliseconds)
    lookbackDays: 14,                    // passed to /muscle-groups/freshness?days= query param
  },

  // Internal state — reset on each module reload
  freshnessData: null, // last successful response from /muscle-groups/freshness
  svgContent: null,    // raw SVG string loaded from disk by node_helper.js
  lastUpdated: null,   // Date of the most recent successful data fetch
  updateTimer: null,   // setInterval handle, kept for potential future cleanup

  // Called by MagicMirror² when the module is initialised.
  // Sends INIT to the helper to retrieve the SVG content, then starts
  // the polling interval.
  start() {
    Log.info("MMM-BuffPenguin: Starting module"); // Log is the MM2 logger (external: MagicMirror² global)
    // Notify node_helper to send the pre-loaded SVG content back immediately.
    this.sendSocketNotification("INIT", { // external: MM2 socket bridge to node_helper.js
      backendUrl: this.config.backendUrl,
      lookbackDays: this.config.lookbackDays,
    });
    this.scheduleUpdate();
  },

  // Sets up a repeating poll for freshness data.
  // Also fires immediately so the display is populated on first render
  // without waiting for the full interval to elapse.
  scheduleUpdate() {
    this.fetchFreshness();
    this.updateTimer = setInterval(() => {
      this.fetchFreshness();
    }, this.config.updateInterval);
  },

  // Asks node_helper.js to fetch the latest freshness data from the backend.
  // node_helper performs the actual HTTP request (see node_helper.js).
  fetchFreshness() {
    this.sendSocketNotification("FETCH_FRESHNESS", { // external: MM2 socket bridge to node_helper.js
      backendUrl: this.config.backendUrl,
      lookbackDays: this.config.lookbackDays,
    });
  },

  // Receives messages from node_helper.js via the MM2 socket bridge.
  // SVG_CONTENT arrives once on startup; FRESHNESS_DATA arrives on each poll.
  socketNotificationReceived(notification, payload) {
    if (notification === "SVG_CONTENT") {
      // The SVG string is sent once by node_helper on INIT. Store it and
      // trigger a DOM rebuild so the figure appears immediately.
      this.svgContent = payload;
      this.updateDom(); // external: MM2 method that calls getDom() and patches the DOM
    } else if (notification === "FRESHNESS_DATA") {
      // New data from the backend arrived — update state and re-render.
      this.freshnessData = payload;
      this.lastUpdated = new Date();
      this.updateDom(); // external: MM2 method
    } else if (notification === "FRESHNESS_ERROR") {
      // Log the error but don't clear existing data — keep showing the last
      // known state rather than blanking the display.
      Log.warn("MMM-BuffPenguin: Failed to fetch freshness data:", payload); // external: MM2 logger
    }
  },

  // Builds and returns the full DOM tree for this module.
  // Called by MM2 whenever updateDom() is invoked.
  // Returns a loading placeholder until the SVG arrives from node_helper.
  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "MMM-BuffPenguin";

    const title = document.createElement("div");
    title.className = "bp-title";
    title.textContent = "Last Trained";
    wrapper.appendChild(title);

    // Show a loading message until the SVG content has been received.
    if (!this.svgContent) {
      const loading = document.createElement("div");
      loading.className = "bp-loading";
      loading.textContent = "Loading...";
      wrapper.appendChild(loading);
      return wrapper;
    }

    // Inject the SVG string as raw HTML. The SVG must be inline (not an <img>)
    // so CSS can reach into it and style individual <path> elements by id.
    const figureContainer = document.createElement("div");
    figureContainer.className = "bp-figures";
    figureContainer.innerHTML = this.svgContent; // SVG paths become real DOM nodes
    wrapper.appendChild(figureContainer);

    // If freshness data is available, colour the muscle region paths now.
    if (this.freshnessData) {
      this.applyFreshness(figureContainer, this.freshnessData.groups);
    }

    wrapper.appendChild(this.buildLegend());

    // Show how long ago the data was last refreshed.
    if (this.lastUpdated) {
      const updated = document.createElement("div");
      updated.className = "bp-updated";
      const minutesAgo = Math.round((Date.now() - this.lastUpdated.getTime()) / 60000);
      updated.textContent = minutesAgo === 0
        ? "Updated just now"
        : `Updated ${minutesAgo} min ago`;
      wrapper.appendChild(updated);
    }

    return wrapper;
  },

  // Adds the freshness CSS class to each muscle region path in the SVG.
  // Looks up elements by their id attribute (matching the slug from the API),
  // as well as optional -anterior and -posterior suffixed variants for muscle
  // groups that appear on both body views in the SVG.
  applyFreshness(container, groups) {
    groups.forEach(({ slug, freshness }) => {
      // Query for the base id and any anterior/posterior sub-regions
      const regions = container.querySelectorAll(
        `[id="${slug}"], [id="${slug}-anterior"], [id="${slug}-posterior"]`
      );
      regions.forEach((el) => {
        // Remove all existing freshness classes before adding the new one
        // to avoid stale classes from the previous render accumulating.
        el.classList.remove("today", "recent", "moderate", "stale", "untrained");
        el.classList.add(freshness); // maps to CSS rules in MMM-BuffPenguin.css
      });
    });
  },

  // Builds the colour-coded legend shown below the figure.
  // Labels correspond to the freshness buckets defined on the backend.
  buildLegend() {
    const legend = document.createElement("div");
    legend.className = "bp-legend";

    const items = [
      { cls: "today",     label: "Today"    },
      { cls: "recent",    label: "1–3 days" },
      { cls: "moderate",  label: "4–6 days" },
      { cls: "stale",     label: "7+ days"  },
    ];

    items.forEach(({ cls, label }) => {
      const item = document.createElement("span");
      item.className = `bp-legend-item ${cls}`; // CSS background colour matches the SVG fill
      item.textContent = label;
      legend.appendChild(item);
    });

    return legend;
  },

  // Tells MM2 which CSS file to load for this module.
  // The file is served from the module's own directory.
  getStyles() {
    return ["MMM-BuffPenguin.css"]; // external: MM2 stylesheet loader
  },
});
