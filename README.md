# Myanmar Weather Safety Dashboard

This branch adds a long-term foundation for a bilingual weather and disaster-awareness dashboard.

## What is included

- Minimalist responsive UI for phones, tablets and desktop screens.
- Burmese/English switching and light/dark theme persistence.
- Direct city/township search without complicated region selectors.
- Open-Meteo weather and air-quality data: rainfall, rain probability, temperature, humidity, wind, UV, AQI, PM2.5, PM10, visibility, pressure and sun times.
- Automatic refresh every 10 minutes.
- Public alert panel using NASA EONET with a GDACS RSS server-side fallback when the FastAPI proxy is running.
- Transparent source labels and a prominent warning that public model/event feeds are not official emergency warnings.
- Heuristic flood and landslide watch cards based on forecast rainfall; these are awareness indicators, not predictions or rescue instructions.

## Important safety limitation

No public web app can guarantee that a flood or landslide will be prevented or detected instantly everywhere. NASA EONET is an event catalogue and may be delayed or incomplete for local incidents. Use official Myanmar authority warnings and emergency services as the highest-priority source.

## Static mode

Open `weather.html` or deploy the repository as a static site. Weather works directly from Open-Meteo. The browser attempts `/api/alerts` first and falls back to NASA EONET where browser CORS allows it.

## Optional FastAPI proxy

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Endpoints:

- `GET /api/weather?lat=21.9588&lon=96.0891`
- `GET /api/alerts`

The proxy caches provider results for 10 minutes, combines NASA EONET and GDACS events, and returns source/timestamp metadata. For production, restrict CORS, add persistent caching, monitoring, rate limits and an official local alert feed.

## File descriptions

- `weather.html`: accessible dashboard structure and safety panels.
- `weather_style.css`: responsive visual system and alert severity styles.
- `weather_script.js`: translations, API calls, rainfall-risk indicators, alert rendering and auto-refresh.
- `main.py`: optional server-side cache and public-feed normalisation.
