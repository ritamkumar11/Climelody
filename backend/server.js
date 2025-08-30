import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

// ---- Config ----
const PORT = process.env.PORT || 5000;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Allow localhost frontends by default; override with FRONTEND_ORIGIN="http://localhost:5173,http://localhost:3000"
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

// CORS + JSON
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// ---- Health ----
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---- Spotify token cache (Client Credentials) ----
let spotifyTokenCache = { access_token: null, expires_at: 0 };

async function getSpotifyAppToken() {
  const now = Math.floor(Date.now() / 1000);
  if (spotifyTokenCache.access_token && spotifyTokenCache.expires_at > now + 10) {
    return spotifyTokenCache.access_token;
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET");
  }

  const r = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({ grant_type: "client_credentials" }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      },
      timeout: 15000,
    }
  );

  const { access_token, expires_in } = r.data;
  spotifyTokenCache = {
    access_token,
    expires_at: now + (expires_in || 3600) - 15,
  };
  return access_token;
}

// ===== Weather → Playlist IDs (fill these with your real playlist IDs) =====
const PLAYLIST_BY_MARKET_AND_WEATHER = {
  IN: {
    rain:        "2fr42GNMLrRJINkqtLofL9",        // e.g. 37i9dQZF1DWXe9gFZP0gtP
    drizzle:     "2fr42GNMLrRJINkqtLofL9",
    thunder:     "2fr42GNMLrRJINkqtLofL9",

    snow:        "37i9dQZF1DWSoLBQNkZBKc",

    clouds:      "2ixO0AIdVvXpDbqoIbxp4f",      // cloudy / overcast
    mist:        "37i9dQZF1DWX76Z8XDsZzF",
    fog:         "37i9dQZF1DWX76Z8XDsZzF",
    haze:        "37i9dQZF1DWX76Z8XDsZzF",

    clear_hot:   "37i9dQZF1DWWfZHTa5oacf",   // clear & hot (>=28°C)
    clear_cold:  "37i9dQZF1DWWfZHTa5oacf",  // clear & cold (<=14°C)
    clear_mild:  "37i9dQZF1DWWfZHTa5oacf",  // clear & mild

    default:     "15Y7M0ExPhbNvbgW0ZVwls",
  },

  // Fallback set for any country you haven't customized yet:
  DEFAULT: {
    rain:        "1YTPE2Ek3xVXF0yML8svLA",
    drizzle:     "1YTPE2Ek3xVXF0yML8svLA",
    thunder:     "1YTPE2Ek3xVXF0yML8svLA",
    snow:        "3DQnpTbd56aCMw2DRWYsTp",
    clouds:      "5WbhszXYAvS1BC2s0LAaKm",
    mist:        "5jD33M0QI76WuggfMDMhHX",
    fog:         "5jD33M0QI76WuggfMDMhHX",
    haze:        "5jD33M0QI76WuggfMDMhHX",
    clear_hot:   "3zheV8ojYjIuRBLXG54QTG",
    clear_cold:  "3zheV8ojYjIuRBLXG54QTG",
    clear_mild:  "3zheV8ojYjIuRBLXG54QTG",
    default:     "1v4Vr8fDdhbwBPQFmljgxZ",
  },
};


// ---- Mapper for Spotify track → frontend shape ----
function mapTrack(t) {
  return {
    id: t.id,
    title: t.name,
    artist: { name: (t.artists || []).map((a) => a.name).join(", ") },
    album: {
      cover_medium: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "",
    },
    preview: t.preview_url || "",
    external_url: t.external_urls?.spotify || "",
  };
}


// Decide a normalized weather key from temp + condition
function weatherKey(tempC, conditionMain) {
  const c = String(conditionMain || "").toLowerCase();

  if (c.includes("rain"))      return "rain";
  if (c.includes("drizzle"))   return "drizzle";
  if (c.includes("thunder"))   return "thunder";
  if (c.includes("snow"))      return "snow";
  if (c.includes("cloud"))     return "clouds";
  if (c.includes("mist"))      return "mist";
  if (c.includes("fog"))       return "fog";
  if (c.includes("haze"))      return "haze";

  if (c.includes("clear")) {
    if (tempC >= 28) return "clear_hot";
    if (tempC <= 14) return "clear_cold";
    return "clear_mild";
  }
  // If API returns something unusual, treat like clouds
  return "clouds";
}

// Pick playlist ID with fallback: exact market key → market default → global key → global default
function pickPlaylistId(market, key) {
  const M = (market || "").toUpperCase();
  const byMarket = PLAYLIST_BY_MARKET_AND_WEATHER[M] || {};
  const global   = PLAYLIST_BY_MARKET_AND_WEATHER.DEFAULT || {};

  return (
    byMarket[key]     || 
    byMarket.default  || 
    global[key]       || 
    global.default    || 
    null
  );
}

// ---- Weather by Geolocation ----
app.post("/api/weather", async (req, res) => {
  const { lat, lon } = req.body || {};
  if (typeof lat !== "number" || typeof lon !== "number") {
    return res.status(400).json({ error: "lat & lon (numbers) are required" });
  }
  if (!WEATHER_API_KEY) {
    console.error("WEATHER_API_KEY is missing");
    return res.status(500).json({ error: "Server missing WEATHER_API_KEY" });
  }

  try {
    const locationRes = await axios.get(
      "https://api.bigdatacloud.net/data/reverse-geocode-client",
      { params: { latitude: lat, longitude: lon, localityLanguage: "en" }, timeout: 15000 }
    );
    const city =
      locationRes.data.city ||
      locationRes.data.locality ||
      locationRes.data.principalSubdivision ||
      "Your location";

    const weatherRes = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: { lat, lon, appid: WEATHER_API_KEY, units: "metric" },
      timeout: 15000,
    });

    res.json({ city, weather: weatherRes.data });
  } catch (error) {
    console.error(
      "Weather API error:",
      error?.response?.status,
      error?.response?.data || error.message
    );
    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      "Failed to fetch weather data";
    res.status(status).json({ error: message });
  }
});

// ---- Weather by City ----
app.get("/api/weather/by-city", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();
    if (!city) return res.status(400).json({ error: "city is required" });
    if (!WEATHER_API_KEY) {
      console.error("WEATHER_API_KEY is missing");
      return res.status(500).json({ error: "Server missing WEATHER_API_KEY" });
    }

    const weatherRes = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: { q: city, appid: WEATHER_API_KEY, units: "metric" },
      timeout: 15000,
    });

    const canonicalCity = weatherRes.data?.name || city;
    res.json({ city: canonicalCity, weather: weatherRes.data });
  } catch (error) {
    console.error(
      "Weather-by-city API error:",
      error?.response?.status,
      error?.response?.data || error.message
    );
    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      "Failed to fetch weather data by city";
    res.status(status).json({ error: message });
  }
});

app.post("/api/recommendations/by-weather", async (req, res) => {
  try {
    const tempC    = Number(req.body?.tempC);
    const condition = String(req.body?.condition || "");
    const market    = String(req.body?.market || "").toUpperCase(); // e.g., "IN"
    if (Number.isNaN(tempC)) {
      return res.status(400).json({ error: "tempC (number) required" });
    }

    const key = weatherKey(tempC, condition);
    const playlistId = pickPlaylistId(market, key);

    // If you haven't configured the id yet, return empty
    if (!playlistId) {
      console.warn(`[by-weather:playlist] No playlist configured for market=${market || "-"} key=${key}`);
      return res.json({ playlistId: null, market, weatherKey: key, data: [] });
    }

    const token = await getSpotifyAppToken();

    // Fetch tracks from the chosen playlist
    const r = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        market: market || undefined, // helps ensure region-available tracks
        limit: 50,
        fields: "items(track(id,name,artists(name),album(images),preview_url,external_urls)),next",
      },
      timeout: 15000,
    });

    const rawItems = (r.data?.items || [])
      .map((it) => it.track)
      .filter(Boolean);

    const tracks = rawItems.map(mapTrack);

    console.log(`[by-weather:playlist] market=${market || "-"} key=${key} playlist=${playlistId} count=${tracks.length}`);

    return res.json({
      playlistId,
      market,
      weatherKey: key,
      data: tracks, // can be []
    });
  } catch (error) {
    console.error("Spotify by-weather (playlist) error:", error?.response?.status, error?.response?.data || error.message);
    // Return empty (no frontend defaults)
    return res.status(200).json({ playlistId: null, market: null, weatherKey: null, data: [] });
  }
});
app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`CORS origin: ${Array.isArray(FRONTEND_ORIGIN) ? FRONTEND_ORIGIN.join(",") : FRONTEND_ORIGIN}`);
});
