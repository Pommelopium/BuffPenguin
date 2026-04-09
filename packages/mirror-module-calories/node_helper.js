// node_helper.js — Server-side helper for MMM-BuffPenguin-Calories.
// Fetches daily calorie sums and the latest body weight from the backend.

const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start() {
    console.log("MMM-BuffPenguin-Calories node_helper started");
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_CALORIES") {
      this.fetchCalories(payload);
    }
  },

  async fetchCalories({ backendUrl, lookbackDays }) {
    try {
      // Calculate date range for calorie query (YYYY-MM-DD format)
      const now = new Date();
      const from = new Date(now.getTime() - lookbackDays * 86400 * 1000);
      const fromStr = from.toISOString().split("T")[0];
      const toStr = now.toISOString().split("T")[0];

      // Fetch both endpoints in parallel
      const [calorieRes, weightRes] = await Promise.all([
        fetch(`${backendUrl}/api/v1/calories/daily?from=${fromStr}&to=${toStr}`, {
          signal: AbortSignal.timeout(5000),
        }),
        fetch(`${backendUrl}/api/v1/weight?from=${Math.floor(from.getTime() / 1000)}`, {
          signal: AbortSignal.timeout(5000),
        }),
      ]);

      if (!calorieRes.ok) throw new Error(`Calories HTTP ${calorieRes.status}`);
      const dailySums = await calorieRes.json();

      let latestWeight = null;
      if (weightRes.ok) {
        const weights = await weightRes.json();
        if (weights.length > 0) {
          latestWeight = weights[0]; // already sorted desc by recordedAt
        }
      }

      this.sendSocketNotification("CALORIE_DATA", { dailySums, latestWeight });
    } catch (err) {
      this.sendSocketNotification("CALORIE_ERROR", err.message);
    }
  },
});
