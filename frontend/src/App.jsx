import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

// If you keep images in /public, use absolute paths like "/clear.jpg" etc.
const getWeatherBackground = (weatherMain) => {
  switch (String(weatherMain || "").toLowerCase()) {
    case "clear":
      return "/clear.jpg";
    case "rain":
    case "drizzle":
      return "/rain.jpg";
    case "clouds":
      return "/clouds.jpg";
    case "snow":
      return "/snow.jpg";
    case "thunderstorm":
      return "/thunderstorm.jpg";
    case "mist":
    case "fog":
    case "haze":
      return "/mist.jpg";
    default:
      return "/default.jpg";
  }
};

const Home = () => {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [songs, setSongs] = useState([]);

  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [errorWeather, setErrorWeather] = useState("");
  const [errorMusic, setErrorMusic] = useState("");

  // ------- Weather by Geolocation -------
  const getWeatherByGeo = async () => {
    try {
      setErrorWeather("");
      setLoadingWeather(true);

      if (!("geolocation" in navigator)) {
        throw new Error("Geolocation not supported by this browser");
      }

      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );

      const { latitude, longitude } = position.coords;
      const res = await axios.post("/api/weather", { lat: latitude, lon: longitude });

      const w = res.data?.weather ?? null;
      setWeather(w);
      setCity(res.data?.city ?? "");
      await fetchMusicForWeather(w);
    } catch (err) {
      console.error("Weather fetch error:", err);
      setErrorWeather(
        err?.message || "Unable to get weather from your current location."
      );
      setSongs([]);
    } finally {
      setLoadingWeather(false);
    }
  };

  // ------- Weather by City -------
  const getWeatherByCity = async (name) => {
    const q = String(name || "").trim();
    if (!q) return;

    try {
      setErrorWeather("");
      setLoadingWeather(true);

      const res = await axios.get("/api/weather/by-city", { params: { city: q } });
      const w = res.data?.weather ?? null;
      setWeather(w);
      setCity(res.data?.city || q);
      await fetchMusicForWeather(w);
    } catch (err) {
      console.error("City weather error:", err);
      setErrorWeather("Could not fetch weather for that city.");
      setSongs([]);
    } finally {
      setLoadingWeather(false);
    }
  };

  // ------- Music Recommendations from Weather -------
  const fetchMusicForWeather = async (w) => {
    if (!w) return;
    try {
      setErrorMusic("");
      setLoadingMusic(true);

      const tempRaw = Number(w?.main?.temp);
      const tempC = Number.isFinite(tempRaw) ? Math.round(tempRaw) : undefined; // send integer to backend
      const condition = String(w?.weather?.[0]?.main ?? "");
      const market = String(w?.sys?.country ?? "").toUpperCase() || undefined; // e.g., "IN"

      const r = await axios.post("/api/recommendations/by-weather", {
        tempC,
        condition,
        market,
      });

      const data = Array.isArray(r.data?.data) ? r.data.data : [];
      setSongs(data);
    } catch (err) {
      console.error("Recommendations error:", err);
      setErrorMusic("Could not load music recommendations.");
      setSongs([]);
    } finally {
      setLoadingMusic(false);
    }
  };

  useEffect(() => {
    // Auto-load by geolocation on first mount
    getWeatherByGeo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safe integer for display only
  const displayTempC =
    weather?.main?.temp != null ? Math.round(weather.main.temp) : null;

  return (
    <div className="mDiv">
      {/* Top Nav */}
      <nav className="hNav">
        <div className="nCont1">
          <img src="/logo2.png" alt="Climelody Logo" />
        </div>
      </nav>

      {/* City search for WEATHER */}
      <div className="controls">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            getWeatherByCity(citySearch);
          }}
        >
          <input
            type="text"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            placeholder="Search city for weather..."
            style={{
              padding: "8px",
              width: "240px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginRight: "10px",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#5b42f3",
              color: "#fff",
              cursor: "pointer",
            }}
            disabled={loadingWeather}
          >
            {loadingWeather ? "Getting..." : "Get Weather"}
          </button>
        </form>
        <button
          onClick={getWeatherByGeo}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            background: "#f7f7f7",
            cursor: "pointer",
          }}
          title="Use my location"
          disabled={loadingWeather}
        >
          Use Current Location
        </button>
      </div>

      {/* Weather error */}
      {errorWeather && (
        <p style={{ color: "#c00", margin: "4px 16px" }}>{errorWeather}</p>
      )}

      {/* Weather card */}
      {weather && (
        <div
          className="wCont"
          style={{
            backgroundImage: `url(${getWeatherBackground(weather?.weather?.[0]?.main)})`,
          }}
        >
          <div className="wLoc">📍{city || "—"}</div>
          <div className="wTemp">🌡️{displayTempC != null ? `${displayTempC} °C` : "—"}</div>
          <div className="wClimate">{weather?.weather?.[0]?.main ?? "—"}</div>
        </div>
      )}

      {/* Music Section */}
      <div className="mCont">
        <div className="mHeading" style={{color:'Black'}}>Music based on Weather</div>

        <div className="mSuggestion">
          {loadingMusic && <p style={{ marginTop: 12 }}>Loading music…</p>}

          {!loadingMusic && errorMusic && (
            <p style={{ color: "#c00", marginTop: 12 }}>{errorMusic}</p>
          )}

          {!loadingMusic && !errorMusic && songs.length === 0 && (
            <p style={{ marginTop: 12 }}>No songs suggested for this weather.</p>
          )}

          {!loadingMusic && !errorMusic && songs.length > 0 && (
            <div className="mGrid">
              {songs.map((song) => {
                // Support both Spotify track object and simplified backend object
                const title = song?.name ?? song?.title ?? "Untitled";
                const artist =
                  (song?.artists && song.artists[0]?.name) ||
                  song?.artist?.name ||
                  "Unknown Artist";
                const cover =
                  (song?.album?.images && song.album.images[0]?.url) ||
                  song?.album?.cover_medium ||
                  "/default-album.jpg";
                const preview = song?.preview_url ?? song?.preview ?? null;
                const external =
                  song?.external_urls?.spotify ?? song?.external_url ?? null;
                const key = song?.id ?? song?.uri ?? `${title}-${artist}`;

                return (
                  <div className="mItem" key={key}>
                    <img className="mCover" src={cover} alt={title} />
                    <h4 className="mTitle">{title}</h4>
                    <p className="mArtist">{artist}</p>
                    {preview ? (
                      <audio controls src={preview} className="mAudio" />
                    ) : external ? (
                      <a
                        href={external}
                        target="_blank"
                        rel="noreferrer"
                        className="mLink"
                      >
                        Open in Spotify
                      </a>
                    ) : (
                      <p className="mNoPreview">No preview available</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
