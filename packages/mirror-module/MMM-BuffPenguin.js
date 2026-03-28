/* global Module, Log */

// MMM-BuffPenguin.js — MagicMirror² browser-side module.
// Runs inside the MagicMirror² Electron/Chromium renderer process.
// Responsible for building the DOM (front + back SVG figures side by side,
// plus a legend) and applying CSS freshness classes to muscle region <g>
// elements by slug ID based on data from the backend.
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
  muscleAssets: null, // { front: svgString, back: svgString } received from node_helper
  freshnessData: null, // last successful response from /muscle-groups/freshness
  lastUpdated: null,   // Date of the most recent successful data fetch
  updateTimer: null,   // setInterval handle, kept for potential future cleanup

  // Called by MagicMirror² when the module is initialised.
  start() {
    Log.info("MMM-BuffPenguin: Starting module"); // Log is the MM2 logger (external: MagicMirror² global)
    this.sendSocketNotification("INIT", { // external: MM2 socket bridge to node_helper.js
      backendUrl: this.config.backendUrl,
      lookbackDays: this.config.lookbackDays,
    });
    this.scheduleUpdate();
  },

  // Sets up a repeating poll for freshness data.
  // Also fires immediately so the display is populated on first render.
  scheduleUpdate() {
    this.fetchFreshness();
    this.updateTimer = setInterval(() => {
      this.fetchFreshness();
    }, this.config.updateInterval);
  },

  // Asks node_helper.js to fetch the latest freshness data from the backend.
  fetchFreshness() {
    this.sendSocketNotification("FETCH_FRESHNESS", { // external: MM2 socket bridge to node_helper.js
      backendUrl: this.config.backendUrl,
      lookbackDays: this.config.lookbackDays,
    });
  },

  // Receives messages from node_helper.js via the MM2 socket bridge.
  socketNotificationReceived(notification, payload) {
    if (notification === "MUSCLE_ASSETS") {
      // The composite SVG strings (front + back) are sent once by node_helper
      // on INIT. Store them and trigger a DOM rebuild so the figures appear.
      this.muscleAssets = payload;
      this.updateDom(); // external: MM2 method that calls getDom() and patches the DOM
    } else if (notification === "FRESHNESS_DATA") {
      this.freshnessData = payload;
      this.lastUpdated = new Date();
      this.updateDom(); // external: MM2 method
    } else if (notification === "FRESHNESS_ERROR") {
      Log.warn("MMM-BuffPenguin: Failed to fetch freshness data:", payload); // external: MM2 logger
    }
  },

  // Builds and returns the full DOM tree for this module.
  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "MMM-BuffPenguin";

    const title = document.createElement("div");
    title.className = "bp-title";
    title.textContent = "Last Trained";
    wrapper.appendChild(title);

    if (!this.muscleAssets) {
      const loading = document.createElement("div");
      loading.className = "bp-loading";
      loading.textContent = "Loading...";
      wrapper.appendChild(loading);
      return wrapper;
    }

    // Render front and back SVGs side by side. Each SVG is injected as raw
    // HTML so the browser creates real SVG DOM nodes — necessary for
    // querySelectorAll to find the muscle <g> elements by id.
    const figureContainer = document.createElement("div");
    figureContainer.className = "bp-figures";

    const frontWrap = document.createElement("div");
    frontWrap.className = "bp-figure-wrap";
    frontWrap.innerHTML = this.muscleAssets.front;

    const backWrap = document.createElement("div");
    backWrap.className = "bp-figure-wrap";
    backWrap.innerHTML = this.muscleAssets.back;

    figureContainer.appendChild(frontWrap);
    figureContainer.appendChild(backWrap);
    wrapper.appendChild(figureContainer);

    if (this.freshnessData) {
      this.applyFreshness(figureContainer, this.freshnessData.groups);
    }

    wrapper.appendChild(this.buildLegend());

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

  // Applies a freshness CSS class to each muscle region <g> element.
  // Searches within container (covers both front and back SVGs) so that
  // muscles visible on both views (e.g. brachioradialis) are highlighted
  // in both figures simultaneously.
  applyFreshness(container, groups) {
    const freshClasses = ["today", "recent", "moderate", "stale", "untrained"];
    groups.forEach(({ slug, freshness }) => {
      container.querySelectorAll(`[id="${slug}"]`).forEach((el) => {
        el.classList.remove(...freshClasses);
        el.classList.add(freshness); // maps to fill colour rules in MMM-BuffPenguin.css
      });
    });
  },

  // Builds the colour-coded legend shown below the figures.
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
      item.className = `bp-legend-item ${cls}`;
      item.textContent = label;
      legend.appendChild(item);
    });

    return legend;
  },

  getStyles() {
    return ["MMM-BuffPenguin.css"]; // external: MM2 stylesheet loader
  },
});
