"""Optional API proxy for deployments that prefer server-side weather requests.

The static frontend does not require this service. Keeping the proxy documented and
small makes a future migration to a server-rendered or rate-limited deployment easier.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Myanmar Weather API", version="1.0.0", description="Optional cached proxy for Open-Meteo weather and air-quality data.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

CACHE: dict[str, tuple[datetime, dict[str, Any]]] = {}
CACHE_MINUTES = 10

@app.get("/api/weather", summary="Get weather and air quality for coordinates")
async def weather(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)) -> dict[str, Any]:
    """Fetch one coordinate from both free Open-Meteo endpoints and cache it briefly."""
    key = f"{lat:.4f}:{lon:.4f}"
    now = datetime.now(timezone.utc)
    cached = CACHE.get(key)
    if cached and now - cached[0] < timedelta(minutes=CACHE_MINUTES):
        return cached[1]

    weather_url = "https://api.open-meteo.com/v1/forecast"
    air_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    weather_params = {"latitude": lat, "longitude": lon, "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,pressure_msl,visibility,wind_speed_10m,wind_direction_10m", "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset", "forecast_days": 7, "timezone": "auto", "wind_speed_unit": "kmh"}
    air_params = {"latitude": lat, "longitude": lon, "current": "us_aqi,pm2_5,pm10", "timezone": "auto"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            weather_response, air_response = await __import__("asyncio").gather(client.get(weather_url, params=weather_params), client.get(air_url, params=air_params))
        if weather_response.status_code != 200:
            raise HTTPException(status_code=502, detail="Weather provider error")
        result = {"weather": weather_response.json(), "air_quality": air_response.json() if air_response.status_code == 200 else {}}
        CACHE[key] = (now, result)
        return result
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Unable to reach weather provider") from exc
