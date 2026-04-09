/* global Module, Log */

// MMM-BuffPenguin-Calories.js — MagicMirror² module for calorie intake vs TDEE chart.
// Uses inline SVG instead of Chart.js. Shows daily calorie intake as a solid line
// and TDEE activity levels as dashed reference lines.

Module.register("MMM-BuffPenguin-Calories", {
  defaults: {
    backendUrl: "http://localhost:3000",
    updateInterval: 60 * 60 * 1000, // 1 hour
    maxLookbackDays: 30,            // max days back from the latest entry
    yearOfBirth: 1990,
    heightCm: 180,
    sex: "male", // "male" | "female"
  },

  calorieData: null,
  latestWeight: null,
  error: null,
  lastUpdated: null,
  updateTimer: null,

  start() {
    Log.info("MMM-BuffPenguin-Calories: Starting module");
    this.scheduleUpdate();
  },

  scheduleUpdate() {
    this.fetchData();
    this.updateTimer = setInterval(() => this.fetchData(), this.config.updateInterval);
  },

  fetchData() {
    this.sendSocketNotification("FETCH_CALORIES", {
      backendUrl: this.config.backendUrl,
    });
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "CALORIE_DATA") {
      this.calorieData = payload.dailySums;
      this.latestWeight = payload.latestWeight;
      this.error = null;
      this.lastUpdated = new Date();
      this.updateDom();
    } else if (notification === "CALORIE_ERROR") {
      Log.warn("MMM-BuffPenguin-Calories: Fetch error:", payload);
      this.error = payload;
      this.updateDom();
    }
  },

  // Harris-Benedict revised equation
  calculateBMR(weightKg) {
    const age = new Date().getFullYear() - this.config.yearOfBirth;
    const h = this.config.heightCm;
    if (this.config.sex === "female") {
      return 447.593 + (9.247 * weightKg) + (3.098 * h) - (4.330 * age);
    }
    return 88.362 + (13.397 * weightKg) + (4.799 * h) - (5.677 * age);
  },

  // Trim data to maxLookbackDays from the latest entry
  trimData(data) {
    if (!data || data.length === 0) return [];
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const latestDate = new Date(sorted[sorted.length - 1].date);
    const cutoff = new Date(latestDate);
    cutoff.setDate(cutoff.getDate() - this.config.maxLookbackDays);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return sorted.filter(e => e.date >= cutoffStr);
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "MMM-BuffPenguin-Calories";

    const title = document.createElement("div");
    title.className = "bpc-title";
    title.textContent = this.translate("TITLE");
    wrapper.appendChild(title);

    if (this.error) {
      const msg = document.createElement("div");
      msg.className = "bpc-no-data";
      msg.textContent = "Error: " + this.error;
      wrapper.appendChild(msg);
      return wrapper;
    }

    if (!this.calorieData) {
      const msg = document.createElement("div");
      msg.className = "bpc-loading";
      msg.textContent = this.translate("LOADING") || "Loading…";
      wrapper.appendChild(msg);
      return wrapper;
    }

    const trimmed = this.trimData(this.calorieData);
    if (trimmed.length === 0) {
      const msg = document.createElement("div");
      msg.className = "bpc-no-data";
      msg.textContent = this.translate("NO_DATA");
      wrapper.appendChild(msg);
      return wrapper;
    }

    const chartWrap = document.createElement("div");
    chartWrap.className = "bpc-chart-wrap";
    chartWrap.innerHTML = this.buildSvgChart(trimmed);
    wrapper.appendChild(chartWrap);

    // Legend
    if (this.latestWeight) {
      const legend = document.createElement("div");
      legend.className = "bpc-legend";
      const bmr = this.calculateBMR(this.latestWeight.weightKg);
      const levels = [
        { factor: 1.2,   key: "SEDENTARY",        color: "#ff4444" },
        { factor: 1.325, key: "LIGHTLY_ACTIVE",    color: "#ffaa00" },
        { factor: 1.55,  key: "MODERATELY_ACTIVE", color: "#ffff44" },
        { factor: 1.725, key: "VERY_ACTIVE",        color: "#88ff44" },
        { factor: 1.9,   key: "EXTRA_ACTIVE",       color: "#44aaff" },
      ];
      levels.forEach(({ factor, key, color }) => {
        const item = document.createElement("span");
        item.className = "bpc-legend-item";
        item.innerHTML = `<span style="color:${color}">—</span> ${this.translate(key)} (${Math.round(bmr * factor)})`;
        legend.appendChild(item);
      });
      wrapper.appendChild(legend);
    }

    if (this.lastUpdated) {
      const updated = document.createElement("div");
      updated.className = "bpc-updated";
      const minutesAgo = Math.round((Date.now() - this.lastUpdated.getTime()) / 60000);
      updated.textContent = minutesAgo === 0
        ? this.translate("UPDATED_JUST_NOW")
        : this.translate("UPDATED_AGO").replace("{MINUTES}", minutesAgo);
      wrapper.appendChild(updated);
    }

    return wrapper;
  },

  buildSvgChart(data) {
    const W = 400, H = 200;
    const PAD_L = 50, PAD_R = 10, PAD_T = 10, PAD_B = 25;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    const cals = data.map(e => e.totalCalories);

    // Include TDEE lines in min/max calculation if weight data exists
    let allValues = [...cals];
    let tdeeLines = [];
    if (this.latestWeight) {
      const bmr = this.calculateBMR(this.latestWeight.weightKg);
      const factors = [1.2, 1.325, 1.55, 1.725, 1.9];
      const colors = ["#ff4444", "#ffaa00", "#ffff44", "#88ff44", "#44aaff"];
      factors.forEach((f, i) => {
        const val = Math.round(bmr * f);
        allValues.push(val);
        tdeeLines.push({ val, color: colors[i] });
      });
    }

    const minC = Math.floor((Math.min(...allValues) - 100) / 100) * 100;
    const maxC = Math.ceil((Math.max(...allValues) + 100) / 100) * 100;
    const range = maxC - minC || 1;

    const toY = (val) => PAD_T + chartH - ((val - minC) / range) * chartH;
    const toX = (i) => PAD_L + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);

    const points = data.map((e, i) => ({ x: toX(i), y: toY(e.totalCalories) }));
    const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    // Fill area
    const fillPath = `M ${points[0].x.toFixed(1)},${(PAD_T + chartH).toFixed(1)} `
      + points.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      + ` L ${points[points.length - 1].x.toFixed(1)},${(PAD_T + chartH).toFixed(1)} Z`;

    // TDEE dashed lines
    let tdeeMarkup = "";
    tdeeLines.forEach(({ val, color }) => {
      const y = toY(val);
      tdeeMarkup += `<line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="1" stroke-dasharray="5,5"/>`;
    });

    // Y-axis labels
    const yTicks = 5;
    let yLabels = "";
    for (let i = 0; i <= yTicks; i++) {
      const val = minC + (range * i / yTicks);
      const y = PAD_T + chartH - (i / yTicks) * chartH;
      yLabels += `<text x="${PAD_L - 5}" y="${y + 3}" text-anchor="end" fill="#888" font-size="9">${Math.round(val)}</text>`;
      yLabels += `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="rgba(255,255,255,0.08)"/>`;
    }

    // X-axis labels
    const maxXLabels = 8;
    const step = Math.max(1, Math.floor(data.length / maxXLabels));
    let xLabels = "";
    for (let i = 0; i < data.length; i += step) {
      xLabels += `<text x="${points[i].x.toFixed(1)}" y="${H - 3}" text-anchor="middle" fill="#888" font-size="9">${data[i].date.slice(5)}</text>`;
    }

    // Data points
    const dots = points.map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="#00ff88"/>`
    ).join("");

    return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${yLabels}${xLabels}${tdeeMarkup}
      <path d="${fillPath}" fill="rgba(0,255,136,0.08)"/>
      <polyline points="${polyline}" fill="none" stroke="#00ff88" stroke-width="2.5"/>
      ${dots}
    </svg>`;
  },

  getStyles() {
    return ["MMM-BuffPenguin-Calories.css"];
  },

  getTranslations() {
    return {
      en: "translations/en.json",
      de: "translations/de.json",
    };
  },
});
