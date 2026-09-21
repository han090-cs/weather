# Myanmar Weather Dashboard

A responsive weather dashboard for Myanmar with forecast data, air quality, UV index, and storm/flood alert awareness.

## Features

- Myanmar region/city/township selection
- Current weather and 7-day forecast
- Rain probability and 24-hour rainfall estimate
- AQI / air quality overview
- UV index and local conditions
- Flood-risk warning layer
- NASA EONET disaster alert feed
- Mobile-friendly responsive design
- Light and dark theme toggle

## Data sources

- Open-Meteo weather forecast
- Open-Meteo air quality API
- NASA EONET event alerts

## Live preview

https://han090-csk.github.io/weather/

## Local run

Open the project folder and serve it with a simple static server:

```bash
cd /home/han/Documents/weather
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/weather.html
```

## Notes

This dashboard is designed for early warning awareness and planning. Rainfall and flood-risk values are forecast-based indicators, not official site-specific river measurements.
