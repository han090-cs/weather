"""Scalable API layer for Myanmar weather and public safety information.

This optional service keeps the simple static website usable while providing one
cached place for public weather, air-quality, earthquake and disaster feeds.
It does not replace official Myanmar emergency announcements.
"""
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any
import asyncio
import json
import os
import time
import xml.etree.ElementTree as ET

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

try:
    from redis.asyncio import Redis
except ImportError:
    Redis = None  # type: ignore

CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "600"))
ALERT_TTL = int(os.getenv("ALERT_TTL_SECONDS", "300"))
REDIS_URL = os.getenv("REDIS_URL", "")
ALLOWED_ORIGINS = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "*").split(",") if x.strip()]
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"
GDACS_URL = "https://www.gdacs.org/xml/rss.xml"
USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
EMSC_URL = "https://www.seismicportal.eu/fdsnws/event/1/query"

memory_cache: dict[str, tuple[float, dict[str, Any]]] = {}
redis_client: Any = None
http_client: httpx.AsyncClient | None = None
alert_task: asyncio.Task[None] | None = None
rate_window: dict[str, tuple[int, float]] = {}


def now_iso() -> str:
    """Return an unambiguous UTC timestamp for every API response."""
    return datetime.now(timezone.utc).isoformat()


async def cache_get(key: str) -> dict[str, Any] | None:
    """Read shared Redis cache, falling back to bounded local memory."""
    if redis_client:
        value = await redis_client.get(key)
        if value:
            return json.loads(value)
    item = memory_cache.get(key)
    if item and item[0] > time.monotonic():
        return item[1]
    memory_cache.pop(key, None)
    return None


async def cache_set(key: str, value: dict[str, Any], ttl: int) -> None:
    """Store a response for all nearby users without overloading providers."""
    if redis_client:
        await redis_client.setex(key, ttl, json.dumps(value))
    memory_cache[key] = (time.monotonic() + ttl, value)
    if len(memory_cache) > 1000:
        for old_key in list(memory_cache)[:200]:
            memory_cache.pop(old_key, None)


async def provider_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """Fetch JSON through one shared connection pool."""
    assert http_client is not None
    response = await http_client.get(url, params=params)
    response.raise_for_status()
    return response.json()


async def collect_alerts() -> dict[str, Any]:
    """Combine NASA EONET and GDACS events near Myanmar."""
    events: list[dict[str, Any]] = []
    try:
        eonet = await provider_json(EONET_URL, {"status": "open", "limit": 100})
        for event in eonet.get("events", []):
            geometry = event.get("geometry", [])
            point = geometry[-1].get("coordinates") if geometry else None
            if point and not (78 <= point[0] <= 101 and 8 <= point[1] <= 29):
                continue
            events.append({"title": event.get("title", "Natural event"), "category": ", ".join(c.get("title", "") for c in event.get("categories", [])) or "NASA event", "url": event.get("link"), "source": "NASA EONET", "date": geometry[-1].get("date") if geometry else None})
    except (httpx.HTTPError, ValueError):
        pass
    try:
        assert http_client is not None
        response = await http_client.get(GDACS_URL)
        if response.is_success:
            root = ET.fromstring(response.text)
            for item in root.findall(".//item"):
                title = item.findtext("title") or "GDACS event"
                if any(word in title.lower() for word in ("myanmar", "burma", "asia")):
                    events.append({"title": title, "category": "GDACS alert", "url": item.findtext("link"), "source": "GDACS", "date": item.findtext("pubDate")})
    except (httpx.HTTPError, ET.ParseError):
        pass
    return {"updated_at": now_iso(), "events": events[:50], "notice": "Public feeds are informational; follow official local warnings."}


async def collect_earthquakes() -> dict[str, Any]:
    """Return recent global earthquakes filtered to Myanmar and nearby waters."""
    events: list[dict[str, Any]] = []
    try:
        feed = await provider_json(USGS_URL)
        for feature in feed.get("features", []):
            coords = feature.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2 or not (88 <= coords[0] <= 101 and 8 <= coords[1] <= 29):
                continue
            props = feature.get("properties", {})
            events.append({"title": props.get("place", "Earthquake"), "magnitude": props.get("mag"), "time": props.get("time"), "url": props.get("url"), "source": "USGS"})
    except (httpx.HTTPError, ValueError):
        pass
    return {"updated_at": now_iso(), "events": events[:30], "notice": "Earthquake data is informational; follow official warnings."}


async def alert_worker() -> None:
    """Refresh disaster and earthquake feeds once per interval for every visitor."""
    while True:
        try:
            await cache_set("alerts:mm", await collect_alerts(), ALERT_TTL)
            await cache_set("earthquakes:mm", await collect_earthquakes(), ALERT_TTL)
        except Exception:
            pass
        await asyncio.sleep(ALERT_TTL)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Create one HTTP pool and one background poller per application instance."""
    global redis_client, http_client, alert_task
    http_client = httpx.AsyncClient(timeout=15, follow_redirects=True, limits=httpx.Limits(max_connections=100, max_keepalive_connections=20))
    if REDIS_URL and Redis:
        redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
    alert_task = asyncio.create_task(alert_worker())
    yield
    if alert_task:
        alert_task.cancel()
    if redis_client:
        await redis_client.aclose()
    await http_client.aclose()


app = FastAPI(title="Myanmar Weather Safety API", version="3.1.0", lifespan=lifespan, description="Cached public weather and safety feeds.")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["GET"], allow_headers=["*"])


@app.middleware("http")
async def request_limit(request: Request, call_next):
    """Apply a basic per-IP guard for small deployments."""
    if request.url.path.startswith("/api/"):
        ip = request.client.host if request.client else "unknown"
        count, expires = rate_window.get(ip, (0, time.monotonic() + 60))
        if time.monotonic() > expires:
            count, expires = 0, time.monotonic() + 60
        rate_window[ip] = (count + 1, expires)
        if count + 1 > 120:
            raise HTTPException(status_code=429, detail="Too many requests; retry shortly.")
    return await call_next(request)


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    """Provide a health check for deployment platforms."""
    redis_ok = False
    if redis_client:
        try:
            redis_ok = bool(await redis_client.ping())
        except Exception:
            pass
    return {"ok": True, "redis": redis_ok, "time": now_iso()}


@app.get("/api/sources")
async def sources() -> dict[str, Any]:
    """Describe the public sources used by the dashboard."""
    return {"sources": [{"name": "Open-Meteo", "purpose": "weather, rainfall, UV"}, {"name": "Open-Meteo Air Quality", "purpose": "AQI, PM2.5, PM10"}, {"name": "NASA EONET", "purpose": "natural event catalogue"}, {"name": "GDACS", "purpose": "global disaster alerts"}, {"name": "USGS", "purpose": "recent earthquakes"}], "updated_at": now_iso(), "notice": "These feeds are not official Myanmar emergency warnings."}


@app.get("/api/weather")
async def weather(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)) -> dict[str, Any]:
    """Return cached forecast and air quality for rounded coordinates."""
    key = f"weather:{lat:.3f}:{lon:.3f}"
    cached = await cache_get(key)
    if cached:
        return cached
    weather_params = {"latitude": lat, "longitude": lon, "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,pressure_msl,visibility,wind_speed_10m,wind_direction_10m", "hourly": "precipitation_probability", "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset", "forecast_days": 7, "timezone": "auto", "wind_speed_unit": "kmh"}
    air_params = {"latitude": lat, "longitude": lon, "current": "us_aqi,pm2_5,pm10", "timezone": "auto"}
    try:
        weather_data, air_data = await asyncio.gather(provider_json(WEATHER_URL, weather_params), provider_json(AIR_URL, air_params))
    except (httpx.HTTPError, AssertionError) as exc:
        raise HTTPException(status_code=502, detail="Weather provider unavailable") from exc
    result = {"weather": weather_data, "air_quality": air_data, "cached_for_seconds": CACHE_TTL, "updated_at": now_iso()}
    await cache_set(key, result, CACHE_TTL)
    return result


@app.get("/api/alerts")
async def alerts() -> dict[str, Any]:
    """Return shared NASA EONET/GDACS events."""
    cached = await cache_get("alerts:mm")
    if cached:
        return cached
    result = await collect_alerts()
    await cache_set("alerts:mm", result, ALERT_TTL)
    return result


@app.get("/api/earthquakes")
async def earthquakes() -> dict[str, Any]:
    """Return recent USGS earthquakes affecting Myanmar or nearby areas."""
    cached = await cache_get("earthquakes:mm")
    if cached:
        return cached
    result = await collect_earthquakes()
    await cache_set("earthquakes:mm", result, ALERT_TTL)
    return result
