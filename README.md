🌤️ Climelody

Climelody is a full-stack web app that combines weather data with Spotify music recommendations.
It fetches real-time weather for a user’s location or searched city, then suggests playlists/tracks based on temperature and conditions.

📌 Features

🌍 Get weather by geolocation or city search

🎵 Automatic Spotify playlist recommendations mapped to weather conditions

🎨 Responsive React frontend with weather-themed backgrounds

⚡ Express backend with caching and clean API endpoints

🔐 Secure API keys via .env files

🚀 Ready for deployment:

Frontend → Vercel

Backend → Render (or any Node hosting)

🛠️ Tech Stack
Frontend

- React 19

- Vite 7

- React Router DOM

- Axios

- CSS3 (responsive design)

Backend

- Node.js 18+

- Express 4

- Axios

- Dotenv

- CORS

APIs

- OpenWeather API

- Spotify Web API

Project Structure
Climelody/
│
├── frontend/ # React + Vite app
│ ├── src/ # Components, pages
│ ├── public/ # Static assets
│ ├── package.json
│ └── .env # VITE_BACKEND_URL
│
├── backend/ # Express server
│ ├── server.js # API routes
│ ├── package.json
│ └── .env # API keys & secrets
│
└── README.md

⚙️ Setup
1. Clone the repo
- bash
  git clone https://github.com/your-username/climelody.git
  cd climelody

2. Install dependencies

- Frontend:

  cd frontend
  npm install


- Backend:

  cd backend
  npm install

3. Environment variables
- Frontend (frontend/.env)
  VITE_BACKEND_URL=http://localhost:5000

- Backend (backend/.env)
  PORT=5000
  FRONTEND_ORIGIN=http://localhost:5173
  WEATHER_API_KEY=your_openweather_api_key
  SPOTIFY_CLIENT_ID=your_spotify_client_id
  SPOTIFY_CLIENT_SECRET=your_spotify_client_secret


⚠️ Never commit .env files — they are already in .gitignore.

▶️ Run Locally
- Backend
  cd backend
  npm run dev   # starts Express server at http://localhost:5000

- Frontend
  cd frontend
  npm run dev   # starts Vite dev server at http://localhost:5173

🚀 Deployment
Frontend (Vercel)

- Connect your repo to Vercel

- Set VITE_BACKEND_URL=https://your-backend.onrender.
  com in Vercel Environment Variables

- Deploy

Backend (Render)

- Create a Web Service on Render

- Set environment variables (PORT, WEATHER_API_KEY,SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, FRONTEND_ORIGIN=https://your-frontend.vercel.app)

- Deploy

📡 API Endpoints
Health Check

- bash
  GET /api/health

Weather by Location

- CSS
  POST /api/weather
  Body: { "lat": 12.97, "lon": 77.59 }

Weather by City
GET /api/weather/by-city?city=Bengaluru

Music Recommendations

- CSS
  POST /api/recommendations/by-weather
  Body: { "tempC": 27, "condition": "Clear", "market": "IN" }

🤝 Contributing

- Fork the repo

- Create a feature branch (git checkout -b feature/xyz)

- Commit your changes (git commit -m "feat: added xyz")

- Push and create a PR

📜 License

This project is for educational/demo purposes. Use your own API keys when deploying.
