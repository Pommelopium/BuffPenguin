// node_helper.js — Server-side helper for MMM-BuffPenguin-Calories.
// Fetches all daily calorie sums and the latest body weight from the backend.

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

  async fetchCalories({ backendUrl }) {
    try {
      const [calorieRes, weightRes] = await Promise.all([
        fetch(`${backendUrl}/api/v1/calories/daily`, {
          signal: AbortSignal.timeout(5000),
        }),
        fetch(`${backendUrl}/api/v1/weight`, {
          signal: AbortSignal.timeout(5000),
        }),
      ]);

      if (!calorieRes.ok) throw new Error(`Calories HTTP ${calorieRes.status}`);
      const dailySums = await calorieRes.json();

      let latestWeight = null;
      if (weightRes.ok) {
        const weights = await weightRes.json();
        if (weights.length > 0) {
          latestWeight = weights[0]; // sorted desc by recordedAt
        }
      }

      this.sendSocketNotification("CALORIE_DATA", { dailySums, latestWeight });
    } catch (err) {
      this.sendSocketNotification("CALORIE_ERROR", err.message);
    }
  },
});
