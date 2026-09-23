"""Optional cached proxy for weather plus public disaster feeds.

This server is not an official warning authority. It normalises public feeds for the
frontend and keeps a short cache so a dashboard refresh does not overload providers.
"""
from datetime import datetime, timedelta, timezone
from typing import Any
import asyncio
import xml.etree.ElementTree as ET
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Myanmar Weather Safety API", version="2.0.0", description="Cached weather, air-quality and public disaster-feed proxy.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])
CACHE: dict[str, tuple[datetime, dict[str, Any]]] = {}
CACHE_MINUTES = 10

async def get_json(client: httpx.AsyncClient, url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    response = await client.get(url, params=params)
    response.raise_for_status()
    return response.json()

@app.get("/api/weather", summary="Get cached weather and air quality")
async def weather(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)) -> dict[str, Any]:
    """Return forecast and air-quality data for one coordinate."""
    key = f"weather:{lat:.4f}:{lon:.4f}"
    now = datetime.now(timezone.utc)
    if key in CACHE and now - CACHE[key][0] < timedelta(minutes=CACHE_MINUTES):
        return CACHE[key][1]
    weather_params = {"latitude": lat, "longitude": lon, "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,pressure_msl,visibility,wind_speed_10m,wind_direction_10m", "hourly": "precipitation_probability", "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset", "forecast_days": 7, "timezone": "auto", "wind_speed_unit": "kmh"}
    air_params = {"latitude": lat, "longitude": lon, "current": "us_aqi,pm2_5,pm10", "timezone": "auto"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            weather_data, air_data = await asyncio.gather(get_json(client, "https://api.open-meteo.com/v1/forecast", weather_params), get_json(client, "https://air-quality-api.open-meteo.com/v1/air-quality", air_params))
        result = {"weather": weather_data, "air_quality": air_data}
        CACHE[key] = (now, result)
        return result
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Weather provider unavailable") from exc

@app.get("/api/alerts", summary="Get public near-real-time disaster events")
async def alerts() -> dict[str, Any]:
    """Combine NASA EONET and GDACS RSS events near Myanmar.

    EONET is an event catalogue, not a guaranteed local early-warning service. The
    response always includes source and timestamp so the UI can explain provenance.
    """
    now = datetime.now(timezone.utc)
    key = "alerts:mm"
    if key in CACHE and now - CACHE[key][0] < timedelta(minutes=10):
        return CACHE[key][1]
    events: list[dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            eonet = await client.get("https://eonet.gsfc.nasa.gov/api/v3/events", params={"status": "open", "limit": 50})
            if eonet.status_code == 200:
                for event in eonet.json().get("events", []):
                    categories = ", ".join(c.get("title", "") for c in event.get("categories", []))
                    geometry = event.get("geometry", [])
                    point = geometry[-1].get("coordinates") if geometry else None
                    if point and not (78 <= point[0] <= 101 and 8 <= point[1] <= 29):
                        continue
                    events.append({"title": event.get("title", "Natural event"), "category": categories or "NASA event", "url": event.get("link"), "source": "NASA EONET", "date": geometry[-1].get("date") if geometry else None})
            gdacs = await client.get("https://www.gdacs.org/xml/rss.xml")
            if gdacs.status_code == 200:
                root = ET.fromstring(gdacs.text)
                for item in root.findall(".//item"):
                    title = item.findtext("title") or "GDACS event"
                    if any(word in title.lower() for word in ("myanmar", "burma", "asia")):
                        events.append({"title": title, "category": "GDACS alert", "url": item.findtext("link"), "source": "GDACS", "date": item.findtext("pubDate")})
    except (httpx.HTTPError, ET.ParseError):
        pass
    result = {"updated_at": now.isoformat(), "events": events[:30], "notice": "Public feeds are informational; follow official local warnings."}
    CACHE[key] = (now, result)
    return result
