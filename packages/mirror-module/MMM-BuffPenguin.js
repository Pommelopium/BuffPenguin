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
    Log.info("MMM-BuffPenguin: Starting module");
    this.sendSocketNotification("INIT", {
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
    this.sendSocketNotification("FETCH_FRESHNESS", {
      backendUrl: this.config.backendUrl,
      lookbackDays: this.config.lookbackDays,
    });
  },

  // Receives messages from node_helper.js via the MM2 socket bridge.
  socketNotificationReceived(notification, payload) {
    if (notification === "MUSCLE_ASSETS") {
      this.muscleAssets = payload;
      this.updateDom();
    } else if (notification === "FRESHNESS_DATA") {
      this.freshnessData = payload;
      this.lastUpdated = new Date();
      this.updateDom();
    } else if (notification === "FRESHNESS_ERROR") {
      Log.warn("MMM-BuffPenguin: Failed to fetch freshness data:", payload);
    }
  },

  // Builds and returns the full DOM tree for this module.
  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "MMM-BuffPenguin";

    const title = document.createElement("div");
    title.className = "bp-title";
    title.textContent = this.translate("TITLE");
    wrapper.appendChild(title);

    if (!this.muscleAssets) {
      const loading = document.createElement("div");
      loading.className = "bp-loading";
      loading.textContent = this.translate("LOADING");
      wrapper.appendChild(loading);
      return wrapper;
    }

    // Render front and back SVGs side by side.
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
        ? this.translate("UPDATED_JUST_NOW")
        : this.translate("UPDATED_AGO").replace("{MINUTES}", minutesAgo);
      wrapper.appendChild(updated);
    }

    return wrapper;
  },

  // Applies a freshness CSS class to each muscle region <g> element.
  applyFreshness(container, groups) {
    const freshClasses = ["today", "recent", "moderate", "stale", "untrained"];
    groups.forEach(({ slug, freshness }) => {
      container.querySelectorAll(`[id="${slug}"]`).forEach((el) => {
        el.classList.remove(...freshClasses);
        el.classList.add(freshness);
      });
    });
  },

  // Builds the colour-coded legend shown below the figures.
  buildLegend() {
    const legend = document.createElement("div");
    legend.className = "bp-legend";

    const items = [
      { cls: "today",     key: "LEGEND_TODAY"    },
      { cls: "recent",    key: "LEGEND_RECENT"   },
      { cls: "moderate",  key: "LEGEND_MODERATE" },
      { cls: "stale",     key: "LEGEND_STALE"    },
    ];

    items.forEach(({ cls, key }) => {
      const item = document.createElement("span");
      item.className = `bp-legend-item ${cls}`;
      item.textContent = this.translate(key);
      legend.appendChild(item);
    });

    return legend;
  },

  getStyles() {
    return ["MMM-BuffPenguin.css"];
  },

  // MM2 i18n: point to translations directory with per-locale JSON files.
  getTranslations() {
    return {
      en: "translations/en.json",
      de: "translations/de.json",
    };
  },
});
