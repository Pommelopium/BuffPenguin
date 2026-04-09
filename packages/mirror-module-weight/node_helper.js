// node_helper.js — Server-side helper for MMM-BuffPenguin-Weight.
// Fetches body weight data from the BuffPenguin backend.

const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start() {
    console.log("MMM-BuffPenguin-Weight node_helper started");
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_WEIGHT") {
      this.fetchWeight(payload);
    }
  },

  async fetchWeight({ backendUrl, lookbackDays }) {
    try {
      const from = Math.floor(Date.now() / 1000) - lookbackDays * 86400;
      const url = `${backendUrl}/api/v1/weight?from=${from}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.sendSocketNotification("WEIGHT_DATA", data);
    } catch (err) {
      this.sendSocketNotification("WEIGHT_ERROR", err.message);
    }
  },
});
