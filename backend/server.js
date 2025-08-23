import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const weather_api_key = process.env.WEATHER_API_KEY;

// Default music if Deezer returns 0 results
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

// Weather API
app.post("/api/weather", async (req, res) => {
  const { lat, lon } = req.body;

  try {
    const locationRes = await axios.get(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const city =
      locationRes.data.city ||
      locationRes.data.locality ||
      locationRes.data.principalSubdivision;

    const weatherRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weather_api_key}&units=metric`
    );

    res.json({
      city,
      weather: weatherRes.data,
    });
  } catch (error) {
    console.error("Weather API error:", error.message);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// Deezer music API
app.get("/api/music/:query", async (req, res) => {
  const query = req.params.query;

  try {
    const response = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&output=json`
    );

    console.log("Deezer API result count:", response.data.data.length);

    // If no results, send default songs
    if (!response.data.data || response.data.data.length === 0) {
      return res.json({ data: defaultSongs });
    }

    res.json(response.data);
  } catch (error) {
    console.error("Deezer API error:", error.message);
    res.status(500).json({ data: defaultSongs });
  }
});

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});
