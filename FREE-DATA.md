# Free-only setup

This project intentionally uses public/free data sources only. No API key, paid subscription, or commercial provider is required for the current dashboard.

## Sources used

| Source | Dashboard use | Access |
|---|---|---|
| Open-Meteo Forecast | Temperature, rain, wind, humidity, UV and 7-day forecast | Free public endpoint; fair-use limits apply |
| Open-Meteo Air Quality | AQI, PM2.5 and PM10 | Free public endpoint; model data |
| Open-Meteo Geocoding | City/township search | Free public endpoint |
| NASA EONET | Natural-event catalogue | Free public endpoint; may not contain every local incident |
| GDACS | Global disaster event feed | Public feed; coverage and timing vary |
| USGS | Recent earthquake GeoJSON | Free public endpoint; filtered for Myanmar and nearby areas |

## Current use without backend

Open `weather.html` directly or host the static files on any static host. Weather and air-quality information works without a server or API key. If a public feed is unavailable, the interface must show unavailable/stale information instead of inventing a value.

## Optional free backend

The FastAPI service in `main.py` is optional. It adds short-lived shared caching so many users do not all request the same provider data. It can run locally or on a free-tier host, but free hosting limits and sleeping services vary.

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Endpoints:

- `GET /api/weather?lat=21.9588&lon=96.0891`
- `GET /api/alerts`
- `GET /api/earthquakes`
- `GET /api/sources`
- `GET /healthz`

## Accuracy and safety

These feeds are forecast, model, satellite or public event data. They are not guaranteed real-time and are not official Myanmar emergency warnings. Flood and landslide cards are awareness indicators, not confirmed predictions. During an emergency, follow official Myanmar authority announcements.
