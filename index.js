import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const API_URL = "https://services.rainbet.com/v1/external/affiliates?start_at=2025-04-17&end_at=2025-05-17&key=CapZg7kT9DKv0IY17yvCAnd4LNguMWkp";
const SELF_URL = "https://projectgambadata.onrender.com/"; // your new Render domain

let cachedData = [];

function maskUsername(username) {
  const lower = username.toLowerCase();
  if (lower.length <= 4) return lower;
  return lower.slice(0, 2) + "***" + lower.slice(-2);
}

async function fetchAndCacheData() {
  try {
    const response = await fetch(API_URL);
    const json = await response.json();

    if (!json.affiliates) return;

    const sorted = json.affiliates.sort((a, b) =>
      parseFloat(b.wagered_amount) - parseFloat(a.wagered_amount)
    );

    const top10 = sorted.slice(0, 10);
    if (top10.length >= 2) [top10[0], top10[1]] = [top10[1], top10[0]];

    cachedData = top10.map(entry => ({
      username: maskUsername(entry.username),
      wagered: Math.round(parseFloat(entry.wagered_amount)),
      weightedWager: Math.round(parseFloat(entry.wagered_amount))
    }));

    console.log(`[✅] Data updated at ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    console.error("[❌] Failed to fetch:", err.message);
  }
}

fetchAndCacheData();
setInterval(fetchAndCacheData, 5 * 60 * 1000); // Refresh every 5 mins

// MAIN ROUTE for your leaderboard frontend to fetch
app.get("/leaderboard/top14", (req, res) => {
  res.json(cachedData);
});

// Self-ping to stay awake
setInterval(() => {
  fetch(SELF_URL + "leaderboard/top14")
    .then(() => console.log(`[🔁] Self-pinged ${SELF_URL}leaderboard/top14`))
    .catch(err => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000); // every 4.5 minutes

app.listen(PORT, () => {
  console.log(`🚀 Server live at http://localhost:${PORT}`);
});
