import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = "https://services.rainbet.com/v1/external/affiliates?start_at=2025-04-17&end_at=2025-05-17&key=CapZg7kT9DKv0IY17yvCAnd4LNguMWkp";

let cachedData = [];

function maskUsername(username) {
  if (username.length <= 4) return username;
  return username.slice(0, 2) + "***" + username.slice(-2);
}

async function fetchAndCacheData() {
  try {
    const response = await fetch(API_URL);
    const json = await response.json();

    if (!json.affiliates) return;

    const sorted = json.affiliates.sort((a, b) => parseFloat(b.wagered_amount) - parseFloat(a.wagered_amount));
    const top10 = sorted.slice(0, 10);
    if (top10.length >= 2) [top10[0], top10[1]] = [top10[1], top10[0]];

    cachedData = top10.map(entry => ({
      username: maskUsername(entry.username),
      wagered: Math.round(parseFloat(entry.wagered_amount)),
      weightedWager: Math.round(parseFloat(entry.wagered_amount))
    }));

    console.log(`[✅] Data updated at ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    console.error("[❌] Fetch failed:", err.message);
  }
}

// Update data every 5 mins
setInterval(fetchAndCacheData, 5 * 60 * 1000);
fetchAndCacheData(); // initial fetch

// Serve cached data
app.get("/", (req, res) => {
  res.json(cachedData);
});

// Self-ping every 4.5 mins
setInterval(() => {
  const url = `http://localhost:${PORT}/`;
  fetch(url)
    .then(() => console.log(`[🔁] Self-pinged ${url}`))
    .catch(err => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000); // 4.5 minutes

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
