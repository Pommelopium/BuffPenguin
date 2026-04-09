/* global Module, Log, Chart */

// MMM-BuffPenguin-Weight.js — MagicMirror² module for body weight line chart.

Module.register("MMM-BuffPenguin-Weight", {
  defaults: {
    backendUrl: "http://localhost:3000",
    updateInterval: 60 * 60 * 1000, // 1 hour
    lookbackDays: 90,
  },

  weightData: null,
  lastUpdated: null,
  updateTimer: null,
  chart: null,

  start() {
    Log.info("MMM-BuffPenguin-Weight: Starting module");
    this.scheduleUpdate();
  },

  scheduleUpdate() {
    this.fetchData();
    this.updateTimer = setInterval(() => this.fetchData(), this.config.updateInterval);
  },

  fetchData() {
    this.sendSocketNotification("FETCH_WEIGHT", {
      backendUrl: this.config.backendUrl,
      lookbackDays: this.config.lookbackDays,
    });
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "WEIGHT_DATA") {
      this.weightData = payload;
      this.error = null;
      this.lastUpdated = new Date();
      this.updateDom();
    } else if (notification === "WEIGHT_ERROR") {
      Log.warn("MMM-BuffPenguin-Weight: Fetch error:", payload);
      this.error = payload;
      this.updateDom();
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "MMM-BuffPenguin-Weight";

    const title = document.createElement("div");
    title.className = "bpw-title";
    title.textContent = this.translate("TITLE");
    wrapper.appendChild(title);

    if (this.error) {
      const msg = document.createElement("div");
      msg.className = "bpw-no-data";
      msg.textContent = `Error: ${this.error}`;
      wrapper.appendChild(msg);
      return wrapper;
    }

    if (!this.weightData || this.weightData.length === 0) {
      const msg = document.createElement("div");
      msg.className = this.weightData ? "bpw-no-data" : "bpw-loading";
      msg.textContent = this.weightData ? this.translate("NO_DATA") : this.translate("LOADING") || "Loading…";
      wrapper.appendChild(msg);
      return wrapper;
    }

    const chartWrap = document.createElement("div");
    chartWrap.className = "bpw-chart-wrap";
    const canvas = document.createElement("canvas");
    chartWrap.appendChild(canvas);
    wrapper.appendChild(chartWrap);

    if (this.lastUpdated) {
      const updated = document.createElement("div");
      updated.className = "bpw-updated";
      const minutesAgo = Math.round((Date.now() - this.lastUpdated.getTime()) / 60000);
      updated.textContent = minutesAgo === 0
        ? this.translate("UPDATED_JUST_NOW")
        : this.translate("UPDATED_AGO").replace("{MINUTES}", minutesAgo);
      wrapper.appendChild(updated);
    }

    // Defer chart creation until canvas is in the DOM
    setTimeout(() => this.renderChart(canvas), 0);

    return wrapper;
  },

  renderChart(canvas) {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    // Sort data oldest first
    const sorted = [...this.weightData].sort((a, b) => a.recordedAt - b.recordedAt);

    const labels = sorted.map(e =>
      new Date(e.recordedAt * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    );
    const data = sorted.map(e => e.weightKg);

    this.chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: this.translate("TITLE"),
          data,
          borderColor: "#00ff88",
          backgroundColor: "rgba(0, 255, 136, 0.1)",
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: "#00ff88",
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: "#888", font: { size: 10 }, maxTicksLimit: 8 },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
          y: {
            ticks: {
              color: "#888",
              font: { size: 10 },
              callback: (v) => v + " kg",
            },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
        },
      },
    });
  },

  getStyles() {
    return ["MMM-BuffPenguin-Weight.css"];
  },

  getScripts() {
    return ["vendor/chart.min.js"];
  },

  getTranslations() {
    return {
      en: "translations/en.json",
      de: "translations/de.json",
    };
  },
});
