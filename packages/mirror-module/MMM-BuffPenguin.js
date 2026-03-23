/* global Module, Log */

Module.register("MMM-BuffPenguin", {
  defaults: {
    backendUrl: "http://localhost:3000",
    updateInterval: 60 * 1000,
    lookbackDays: 14,
  },

  // Internal state
  freshnessData: null,
  svgContent: null,
  lastUpdated: null,
  updateTimer: null,

  start() {
    Log.info("MMM-BuffPenguin: Starting module");
    this.sendSocketNotification("INIT", {
      backendUrl: this.config.backendUrl,
      lookbackDays: this.config.lookbackDays,
    });
    this.scheduleUpdate();
  },

  scheduleUpdate() {
    this.fetchFreshness();
    this.updateTimer = setInterval(() => {
      this.fetchFreshness();
    }, this.config.updateInterval);
  },

  fetchFreshness() {
    this.sendSocketNotification("FETCH_FRESHNESS", {
      backendUrl: this.config.backendUrl,
      lookbackDays: this.config.lookbackDays,
    });
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "SVG_CONTENT") {
      this.svgContent = payload;
      this.updateDom();
    } else if (notification === "FRESHNESS_DATA") {
      this.freshnessData = payload;
      this.lastUpdated = new Date();
      this.updateDom();
    } else if (notification === "FRESHNESS_ERROR") {
      Log.warn("MMM-BuffPenguin: Failed to fetch freshness data:", payload);
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "MMM-BuffPenguin";

    const title = document.createElement("div");
    title.className = "bp-title";
    title.textContent = "Last Trained";
    wrapper.appendChild(title);

    if (!this.svgContent) {
      const loading = document.createElement("div");
      loading.className = "bp-loading";
      loading.textContent = "Loading...";
      wrapper.appendChild(loading);
      return wrapper;
    }

    const figureContainer = document.createElement("div");
    figureContainer.className = "bp-figures";
    figureContainer.innerHTML = this.svgContent;
    wrapper.appendChild(figureContainer);

    // Apply freshness CSS classes to muscle region paths
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

  applyFreshness(container, groups) {
    groups.forEach(({ slug, freshness }) => {
      // Both anterior and posterior regions may share the same slug prefix
      const regions = container.querySelectorAll(`[id="${slug}"], [id="${slug}-anterior"], [id="${slug}-posterior"]`);
      regions.forEach((el) => {
        el.classList.remove("today", "recent", "moderate", "stale", "untrained");
        el.classList.add(freshness);
      });
    });
  },

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
    return ["MMM-BuffPenguin.css"];
  },
});
