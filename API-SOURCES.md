# Free public data sources

The dashboard uses no paid API key in static mode. The optional FastAPI proxy adds shared caching and these public feeds:

| Source | Use | Note |
|---|---|---|
| Open-Meteo | Weather, rainfall, UV and forecast | Primary source; fair-use limits apply |
| Open-Meteo Air Quality | AQI, PM2.5 and PM10 | Model/forecast values |
| Open-Meteo Geocoding | City/township search | Search results can vary by spelling |
| NASA EONET | Natural event catalogue | Not a guaranteed local early-warning feed |
| GDACS | Global disaster alerts | Event coverage and timing can vary |
| USGS | Recent earthquake feed | Myanmar/nearby coordinates are filtered |

Static mode remains the recommended simple Myanmar setup: `weather.html` directly calls Open-Meteo and attempts the public NASA event feed. The optional proxy exposes `/api/weather`, `/api/alerts`, `/api/earthquakes` and `/api/sources` with a short cache so many users do not all call providers at once.

## Important

Free services are not unlimited and can rate-limit heavy traffic. Do not present any model or public event feed as an official emergency warning. Show the source and update time, and follow official Myanmar authority announcements during emergencies.
