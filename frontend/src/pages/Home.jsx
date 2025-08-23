import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const defaultSongs = [
  {
    id: 1,
    title: "Happy Song",
    artist: { name: "Artist 1" },
    album: { cover_medium: "./default-album.jpg" },
    preview: "./default-preview.mp3",
  },
  {
    id: 2,
    title: "Chill Vibes",
    artist: { name: "Artist 2" },
    album: { cover_medium: "./default-album2.jpg" },
    preview: "./default-preview2.mp3",
  },
];

const Home = () => {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState("");
  const [songs, setSongs] = useState(defaultSongs);
  const [musicQuery, setMusicQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const getWeatherBackground = (weatherMain) => {
    switch (weatherMain.toLowerCase()) {
      case "clear":
        return "./clear.jpg";
      case "rain":
      case "drizzle":
        return "./rain.jpg";
      case "clouds":
        return "./clouds.jpg";
      case "snow":
        return "./snow.jpg";
      case "thunderstorm":
        return "./thunderstorm.jpg";
      case "mist":
      case "fog":
      case "haze":
        return "./mist.jpg";
      default:
        return "./default.jpg";
    }
  };

  // Fetch weather
  const getWeather = async () => {
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );
      const { latitude, longitude } = position.coords;

      const res = await axios.post("/api/weather", { lat: latitude, lon: longitude });
      setWeather(res.data.weather);
      setCity(res.data.city);

      // Music query based on weather
      const weatherMood = res.data.weather.weather[0].main;
      setMusicQuery(weatherMood);
    } catch (err) {
      console.error("Weather fetch error:", err);
    }
  };

  // Fetch music
  const getMusic = async (query) => {
    try {
      if (!query) {
        setSongs(defaultSongs);
        return;
      }
      const res = await axios.get(`/api/music/${query}`);
      setSongs(res.data.data.length > 0 ? res.data.data : defaultSongs);
    } catch (err) {
      console.error("Music fetch error:", err);
      setSongs(defaultSongs);
    }
  };

  // Search handler
  const handleSearch = (e) => {
    e.preventDefault();
    setMusicQuery(searchInput.trim());
  };

  useEffect(() => {
    getWeather();
  }, []);

  useEffect(() => {
    if (musicQuery) getMusic(musicQuery);
  }, [musicQuery]);

  if (!weather) return <p>Loading weather...</p>;

  return (
    <div className="mDiv">
      <nav className="hNav">
        <div className="nCont1">
          <Link to="/">
            <img src="./logo2.png" alt="Climelody Logo" />
          </Link>
        </div>
        <div className="nCont2">
          <Link to="/Login">
            <img src="./login.png" alt="Login" />
          </Link>
        </div>
      </nav>

      <div
        className="wCont"
        style={{
          backgroundImage: `url(${getWeatherBackground(weather.weather[0].main)})`,
        }}
      >
        <div className="wLoc">📍{city}</div>
        <div className="wTemp">🌡️{weather.main.temp} °C</div>
        <div className="wClimate">{weather.weather[0].main}</div>
      </div>

      <div className="mCont">
        <div className="mHeading">Music based on Weather</div>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ marginBottom: "20px" }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search music..."
            style={{
              padding: "8px",
              width: "200px",
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
          >
            Search
          </button>
        </form>

        <div className="mSuggestion">
          {songs.map((song) => (
            <div key={song.id}>
              <img
                src={song.album?.cover_medium || "./default-album.jpg"}
                alt={song.title}
              />
              <h4>{song.title}</h4>
              <p>{song.artist?.name || "Unknown Artist"}</p>
              {song.preview ? (
                <audio controls src={song.preview}></audio>
              ) : (
                <p>No preview available</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
