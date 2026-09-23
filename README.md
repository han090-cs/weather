# Myanmar Weather Dashboard

A simple bilingual weather dashboard that uses free public data only.

## Features

- Burmese/English interface toggle.
- Direct city and township search without complicated region selectors.
- Responsive minimalist design for phones, tablets and desktop browsers.
- Current weather, feels-like temperature, rainfall, rain probability, wind and humidity.
- UV index, US AQI, PM2.5 and PM10.
- Seven-day forecast, sunrise, sunset, pressure and visibility.
- Forecast-based flood and landslide awareness cards.
- Optional NASA EONET, GDACS and USGS public-feed aggregation through `main.py`.
- Short cache, health endpoint and basic request protection in the optional backend.

## Free-only policy

The project does not require a paid API, API key or subscription. See `FREE-DATA.md` for the complete source list and limitations.

## Important warning

Public and model data can be delayed, incomplete or wrong for a specific street or township. This website is an information and awareness tool, not an official emergency-warning service. Always follow official Myanmar authority announcements during floods, landslides, storms and earthquakes.

## Run the simple version

Open `weather.html` in a modern browser. The static page can operate without FastAPI, Redis or a database.

## Optional cached service

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

The optional service exposes `/api/weather`, `/api/alerts`, `/api/earthquakes`, `/api/sources` and `/healthz`. Redis is optional; the service uses a bounded in-memory fallback for local use.

## File descriptions

- `weather.html`: page structure and accessible controls.
- `weather_style.css`: minimalist responsive design.
- `weather_script.js`: translations, search, weather and air-quality rendering.
- `main.py`: optional cached aggregation of free public feeds.
- `FREE-DATA.md`: free-source list, limits and safety notes.
