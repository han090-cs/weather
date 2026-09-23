"""Scalable API layer for the Myanmar weather and safety dashboard.

The browser can still run in static mode, but production deployments should route
all requests through this service. Provider calls are cached in Redis when REDIS_URL
is configured, with a bounded in-memory fallback for local development.
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
except ImportError:  # pragma: no cover - local fallback when optional dependency is absent
    Redis = None  # type: ignore

CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "600"))
ALERT_TTL = int(os.getenv("ALERT_TTL_SECONDS", "300"))
REDIS_URL = os.getenv("REDIS_URL", "")
ALLOWED_ORIGINS = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "*").split(",") if x.strip()]
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"
GDACS_URL = "https://www.gdacs.org/xml/rss.xml"

memory_cache: dict[str, tuple[float, dict[str, Any]]] = {}
redis_client: Any = None
http_client: httpx.AsyncClient | None = None
alert_task: asyncio.Task[None] | None = None
rate_window: dict[str, tuple[int, float]] = {}


def now_iso() -> str:
    """Return a consistent UTC timestamp for clients and monitoring."""
    return datetime.now(timezone.utc).isoformat()


async def cache_get(key: str) -> dict[str, Any] | None:
    """Read JSON from Redis first, then use the bounded local fallback."""
    if redis_client:
        value = await redis_client.get(key)
        if value:
            return json.loads(value)
    local = memory_cache.get(key)
    if local and local[0] > time.monotonic():
        return local[1]
    memory_cache.pop(key, None)
    return None


async def cache_set(key: str, value: dict[str, Any], ttl: int) -> None:
    """Write a short-lived response to the shared cache and local fallback."""
    if redis_client:
        await redis_client.setex(key, ttl, json.dumps(value))
    memory_cache[key] = (time.monotonic() + ttl, value)
    # Prevent an accidental unbounded fallback if Redis is unavailable.
    if len(memory_cache) > 1000:
        for old_key in list(memory_cache)[:200]:
            memory_cache.pop(old_key, None)


async def provider_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """Fetch a provider JSON response with one shared connection pool."""
    assert http_client is not None
    response = await http_client.get(url, params=params)
    response.raise_for_status()
    return response.json()


async def collect_alerts() -> dict[str, Any]:
    """Collect public event feeds once for all users instead of per browser request."""
    events: list[dict[str, Any]] = []
    try:
        eonet = await provider_json(EONET_URL, {"status": "open", "limit": 100})
        for event in eonet.get("events", []):
            geometry = event.get("geometry", [])
            point = geometry[-1].get("coordinates") if geometry else None
            # Keep events in the Myanmar/nearby region when coordinates are available.
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


async def alert_worker() -> None:
    """Refresh the shared disaster feed in the background every five minutes."""
    while True:
        try:
            await cache_set("alerts:mm", await collect_alerts(), ALERT_TTL)
        except Exception:
            pass
        await asyncio.sleep(ALERT_TTL)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Create shared clients and start one poller per application instance."""
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


app = FastAPI(title="Myanmar Weather Safety API", version="3.0.0", lifespan=lifespan, description="Cached weather and public disaster-feed API.")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["GET"], allow_headers=["*"])


@app.middleware("http")
async def request_limit(request: Request, call_next):
    """Apply a conservative per-IP limit; use Redis-backed gateway limits at scale."""
    if request.url.path.startswith("/api/"):
        ip = request.client.host if request.client else "unknown"
        current, expires = rate_window.get(ip, (0, time.monotonic() + 60))
        if time.monotonic() > expires:
            current, expires = 0, time.monotonic() + 60
        current += 1
        rate_window[ip] = (current, expires)
        if current > 120:
            raise HTTPException(status_code=429, detail="Too many requests; please retry shortly.")
    return await call_next(request)


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    """Return a lightweight health response for load balancers and uptime checks."""
    redis_ok = False
    if redis_client:
        try:
            redis_ok = bool(await redis_client.ping())
        except Exception:
            redis_ok = False
    return {"ok": True, "redis": redis_ok, "time": now_iso()}


@app.get("/api/weather")
async def weather(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)) -> dict[str, Any]:
    """Return one cached forecast and air-quality response for rounded coordinates."""
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
    """Return the shared, periodically refreshed public disaster feed."""
    cached = await cache_get("alerts:mm")
    if cached:
        return cached
    result = await collect_alerts()
    await cache_set("alerts:mm", result, ALERT_TTL)
    return result
