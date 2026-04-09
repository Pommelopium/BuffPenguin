/* global Module, Log */

// MMM-BuffPenguin-Weight.js — MagicMirror² module for body weight line chart.
// Uses inline SVG instead of Chart.js for reliable rendering in MM² Electron.

Module.register("MMM-BuffPenguin-Weight", {
  defaults: {
    backendUrl: "http://localhost:3000",
    updateInterval: 60 * 60 * 1000, // 1 hour
    maxLookbackDays: 90,            // max days back from the latest entry
  },

  weightData: null,
  error: null,
  lastUpdated: null,
  updateTimer: null,

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

  // Trim data to maxLookbackDays from the latest entry
  trimData(data) {
    if (!data || data.length === 0) return [];
    const sorted = [...data].sort((a, b) => a.recordedAt - b.recordedAt);
    const latest = sorted[sorted.length - 1].recordedAt;
    const cutoff = latest - this.config.maxLookbackDays * 86400;
    return sorted.filter(e => e.recordedAt >= cutoff);
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
      msg.textContent = "Error: " + this.error;
      wrapper.appendChild(msg);
      return wrapper;
    }

    if (!this.weightData) {
      const msg = document.createElement("div");
      msg.className = "bpw-loading";
      msg.textContent = this.translate("LOADING") || "Loading…";
      wrapper.appendChild(msg);
      return wrapper;
    }

    const trimmed = this.trimData(this.weightData);
    if (trimmed.length === 0) {
      const msg = document.createElement("div");
      msg.className = "bpw-no-data";
      msg.textContent = this.translate("NO_DATA");
      wrapper.appendChild(msg);
      return wrapper;
    }

    const chartWrap = document.createElement("div");
    chartWrap.className = "bpw-chart-wrap";
    chartWrap.innerHTML = this.buildSvgChart(trimmed);
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

    return wrapper;
  },

  buildSvgChart(data) {
    const W = 320, H = 160;
    const PAD_L = 45, PAD_R = 10, PAD_T = 10, PAD_B = 25;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    const weights = data.map(e => e.weightKg);
    const minW = Math.floor(Math.min(...weights) - 1);
    const maxW = Math.ceil(Math.max(...weights) + 1);
    const range = maxW - minW || 1;

    const points = data.map((e, i) => {
      const x = PAD_L + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
      const y = PAD_T + chartH - ((e.weightKg - minW) / range) * chartH;
      return { x, y, e };
    });

    const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    // Fill area under the line
    const fillPath = `M ${points[0].x.toFixed(1)},${(PAD_T + chartH).toFixed(1)} `
      + points.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      + ` L ${points[points.length - 1].x.toFixed(1)},${(PAD_T + chartH).toFixed(1)} Z`;

    // Y-axis labels (5 ticks)
    const yTicks = 5;
    let yLabels = "";
    for (let i = 0; i <= yTicks; i++) {
      const val = minW + (range * i / yTicks);
      const y = PAD_T + chartH - (i / yTicks) * chartH;
      yLabels += `<text x="${PAD_L - 5}" y="${y + 3}" text-anchor="end" fill="#888" font-size="9">${val.toFixed(1)}</text>`;
      yLabels += `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="rgba(255,255,255,0.08)"/>`;
    }

    // X-axis labels (up to 6)
    const maxXLabels = 6;
    const step = Math.max(1, Math.floor(data.length / maxXLabels));
    let xLabels = "";
    for (let i = 0; i < data.length; i += step) {
      const d = new Date(data[i].recordedAt * 1000);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      xLabels += `<text x="${points[i].x.toFixed(1)}" y="${H - 3}" text-anchor="middle" fill="#888" font-size="9">${label}</text>`;
    }

    // Data points
    const dots = points.map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#00ff88"/>`
    ).join("");

    return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${yLabels}${xLabels}
      <path d="${fillPath}" fill="rgba(0,255,136,0.1)"/>
      <polyline points="${polyline}" fill="none" stroke="#00ff88" stroke-width="2"/>
      ${dots}
    </svg>`;
  },

  getStyles() {
    return ["MMM-BuffPenguin-Weight.css"];
  },

  getTranslations() {
    return {
      en: "translations/en.json",
      de: "translations/de.json",
    };
  },
});
