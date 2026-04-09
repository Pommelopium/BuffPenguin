/* global Module, Log, Chart */

// MMM-BuffPenguin-Calories.js — MagicMirror² module for calorie intake vs TDEE chart.
// Shows actual daily calorie intake as a solid line and five TDEE activity levels
// as dashed reference lines. BMR is calculated using the Harris-Benedict revised
// equation with the latest body weight from the backend.

Module.register("MMM-BuffPenguin-Calories", {
  defaults: {
    backendUrl: "http://localhost:3000",
    updateInterval: 60 * 60 * 1000, // 1 hour
    lookbackDays: 30,
    yearOfBirth: 1990,
    heightCm: 180,
    sex: "male", // "male" | "female"
  },

  calorieData: null,  // array of { date, totalCalories }
  latestWeight: null,  // latest body weight entry or null
  lastUpdated: null,
  updateTimer: null,
  chart: null,

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
      lookbackDays: this.config.lookbackDays,
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
    const now = new Date();
    const age = now.getFullYear() - this.config.yearOfBirth;
    const h = this.config.heightCm;

    if (this.config.sex === "female") {
      return 447.593 + (9.247 * weightKg) + (3.098 * h) - (4.330 * age);
    }
    // male
    return 88.362 + (13.397 * weightKg) + (4.799 * h) - (5.677 * age);
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
      msg.textContent = `Error: ${this.error}`;
      wrapper.appendChild(msg);
      return wrapper;
    }

    if (!this.calorieData) {
      const msg = document.createElement("div");
      msg.className = "bpc-loading";
      msg.textContent = "Loading…";
      wrapper.appendChild(msg);
      return wrapper;
    }

    if (this.calorieData.length === 0) {
      const msg = document.createElement("div");
      msg.className = "bpc-no-data";
      msg.textContent = this.translate("NO_DATA");
      wrapper.appendChild(msg);
      return wrapper;
    }

    const chartWrap = document.createElement("div");
    chartWrap.className = "bpc-chart-wrap";
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 220;
    chartWrap.appendChild(canvas);
    wrapper.appendChild(chartWrap);

    if (this.lastUpdated) {
      const updated = document.createElement("div");
      updated.className = "bpc-updated";
      const minutesAgo = Math.round((Date.now() - this.lastUpdated.getTime()) / 60000);
      updated.textContent = minutesAgo === 0
        ? this.translate("UPDATED_JUST_NOW")
        : this.translate("UPDATED_AGO").replace("{MINUTES}", minutesAgo);
      wrapper.appendChild(updated);
    }

    setTimeout(() => this.renderChart(canvas), 100);
    return wrapper;
  },

  renderChart(canvas) {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const labels = this.calorieData.map(e => e.date);
    const intakeData = this.calorieData.map(e => e.totalCalories);

    const datasets = [
      {
        label: this.translate("ACTUAL_INTAKE"),
        data: intakeData,
        borderColor: "#00ff88",
        backgroundColor: "rgba(0, 255, 136, 0.08)",
        borderWidth: 3,
        pointRadius: 3,
        pointBackgroundColor: "#00ff88",
        fill: true,
        tension: 0.3,
      },
    ];

    // Add TDEE reference lines if we have weight data
    if (this.latestWeight) {
      const bmr = this.calculateBMR(this.latestWeight.weightKg);
      const levels = [
        { factor: 1.2,   key: "SEDENTARY",         color: "#ff4444" },
        { factor: 1.325, key: "LIGHTLY_ACTIVE",     color: "#ffaa00" },
        { factor: 1.55,  key: "MODERATELY_ACTIVE",  color: "#ffff44" },
        { factor: 1.725, key: "VERY_ACTIVE",         color: "#88ff44" },
        { factor: 1.9,   key: "EXTRA_ACTIVE",        color: "#44aaff" },
      ];

      for (const { factor, key, color } of levels) {
        const tdee = Math.round(bmr * factor);
        datasets.push({
          label: this.translate(key),
          data: labels.map(() => tdee),
          borderColor: color,
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0,
        });
      }
    }

    this.chart = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              color: "#aaa",
              font: { size: 9 },
              boxWidth: 12,
              padding: 6,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#888", font: { size: 9 }, maxTicksLimit: 10 },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
          y: {
            ticks: {
              color: "#888",
              font: { size: 9 },
              callback: (v) => v + " kcal",
            },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
        },
      },
    });
  },

  getStyles() {
    return ["MMM-BuffPenguin-Calories.css"];
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
