import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = "CapZg7kT9DKv0IY17yvCAnd4LNguMWkp";
const SELF_URL = "https://projectgambadata.onrender.com/leaderboard/top14";

let cachedData = [];

// ✅ CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

function maskUsername(username) {
  if (username.length <= 4) return username;
  return username.slice(0, 2) + "***" + username.slice(-2);
}

// 🗓 Get correct 17th–16th period that includes today
function getStartEndDates() {
  const now = new Date();
  let endMonth = now.getUTCMonth();
  let endYear = now.getUTCFullYear();

  const thisMonth16 = new Date(Date.UTC(endYear, endMonth, 16, 23, 59, 59));

  // If today is after the 16th, shift window forward
  if (now > thisMonth16) {
    endMonth += 1;
    if (endMonth > 11) {
      endMonth = 0;
      endYear += 1;
    }
  }

  const end_at = new Date(Date.UTC(endYear, endMonth, 16)).toISOString().split("T")[0];

  // Get 17th of previous month
  let startMonth = endMonth - 1;
  let startYear = endYear;
  if (startMonth < 0) {
    startMonth = 11;
    startYear -= 1;
  }

  const start_at = new Date(Date.UTC(startYear, startMonth, 17)).toISOString().split("T")[0];

  return { start_at, end_at };
}

async function fetchAndCacheData() {
  try {
    const { start_at, end_at } = getStartEndDates();
    const apiUrl = `https://services.rainbet.com/v1/external/affiliates?start_at=${start_at}&end_at=${end_at}&key=${API_KEY}`;

    const response = await fetch(apiUrl);
    const json = await response.json();
    if (!json.affiliates) throw new Error("No data");

    const sorted = json.affiliates.sort((a, b) => parseFloat(b.wagered_amount) - parseFloat(a.wagered_amount));
    const top10 = sorted.slice(0, 10);
    if (top10.length >= 2) [top10[0], top10[1]] = [top10[1], top10[0]];

    cachedData = top10.map(entry => ({
      username: maskUsername(entry.username),
      wagered: Math.round(parseFloat(entry.wagered_amount)),
      weightedWager: Math.round(parseFloat(entry.wagered_amount))
    }));

    console.log(`[✅] Leaderboard updated (${start_at} → ${end_at})`);
  } catch (err) {
    console.error("[❌] Failed to fetch Rainbet data:", err.message);
  }
}

fetchAndCacheData();
setInterval(fetchAndCacheData, 5 * 60 * 1000); // every 5 minutes

app.get("/leaderboard/top14", (req, res) => {
  res.json(cachedData);
});

setInterval(() => {
  fetch(SELF_URL)
    .then(() => console.log(`[🔁] Self-pinged ${SELF_URL}`))
    .catch(err => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000); // every 4.5 minutes

app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
