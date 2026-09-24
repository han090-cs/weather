"""Lightweight, cached proxy for the Myanmar Weather dashboard.

The proxy deliberately protects upstream free APIs: responses are cached, identical
requests are coalesced, and each client has a small rolling request budget.
"""
from __future__ import annotations

import asyncio
import os
import time
from collections import OrderedDict, defaultdict, deque
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

APP_VERSION = "2.1.0"
WEATHER_TTL = int(os.getenv("WEATHER_CACHE_TTL", "600"))
CLIMATE_TTL = int(os.getenv("CLIMATE_CACHE_TTL", "86400"))
GEOCODE_TTL = int(os.getenv("GEOCODE_CACHE_TTL", "3600"))
MAX_CACHE_ITEMS = 300
REQUEST_TIMEOUT = float(os.getenv("WEATHER_HTTP_TIMEOUT", "12"))
RATE_WINDOW = 60.0
RATE_LIMIT = int(os.getenv("WEATHER_RATE_LIMIT", "45"))

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
NASA_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

Cache = OrderedDict[str, tuple[float, dict[str, Any]]]
weather_cache: Cache = OrderedDict()
climate_cache: Cache = OrderedDict()
geocode_cache: Cache = OrderedDict()
inflight: dict[str, asyncio.Task] = {}
rate_buckets: defaultdict[str, deque[float]] = defaultdict(deque)
client: httpx.AsyncClient | None = None


def cache_get(cache: Cache, key: str, ttl: int) -> dict[str, Any] | None:
    item = cache.get(key)
    if item is None:
        return None
    created, value = item
    if time.monotonic() - created >= ttl:
        cache.pop(key, None)
        return None
    cache.move_to_end(key)
    return value


def cache_set(cache: Cache, key: str, value: dict[str, Any]) -> None:
    cache[key] = (time.monotonic(), value)
    cache.move_to_end(key)
    while len(cache) > MAX_CACHE_ITEMS:
        cache.popitem(last=False)


def allow_request(request: Request) -> None:
    """A small per-client guard so browser retries cannot exhaust provider quotas."""
    forwarded = request.headers.get("x-forwarded-for", "")
    identity = forwarded.split(",", 1)[0].strip() or (request.client.host if request.client else "unknown")
    now = time.monotonic()
    bucket = rate_buckets[identity]
    while bucket and now - bucket[0] >= RATE_WINDOW:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT:
        raise HTTPException(429, "Too many requests. Please wait a moment and try again.", headers={"Retry-After": "30"})
    bucket.append(now)


@asynccontextmanager
async def lifespan(_: FastAPI):
    global client
    client = httpx.AsyncClient(
        timeout=httpx.Timeout(REQUEST_TIMEOUT, connect=5.0),
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=8),
        headers={"User-Agent": f"MyanmarWeather/{APP_VERSION}"},
    )
    yield
    await client.aclose()
    client = None


app = FastAPI(title="Myanmar Weather Dashboard API", version=APP_VERSION, lifespan=lifespan)
origins = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "*").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET"], allow_headers=["*"])


async def fetch_json(url: str, params: dict[str, Any], attempts: int = 2) -> tuple[dict[str, Any], int]:
    if client is None:
        raise HTTPException(503, "HTTP client is not ready")
    error: Exception | None = None
    for attempt in range(attempts):
        try:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                return response.json(), 200
            if 400 <= response.status_code < 500:
                detail = "Weather provider rejected the request"
                try:
                    detail = response.json().get("reason") or detail
                except (ValueError, TypeError):
                    pass
                raise HTTPException(502, detail)
            error = RuntimeError(f"Provider HTTP {response.status_code}")
        except HTTPException:
            raise
        except (httpx.HTTPError, ValueError) as exc:
            error = exc
        if attempt + 1 < attempts:
            await asyncio.sleep(0.3 * (attempt + 1))
    raise HTTPException(502, "Weather provider is temporarily unavailable") from error


async def coalesced(key: str, operation):
    task = inflight.get(key)
    if task is None:
        task = asyncio.create_task(operation())
        inflight[key] = task
    try:
        return await task
    finally:
        if inflight.get(key) is task:
            inflight.pop(key, None)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "service": "myanmar-weather", "version": APP_VERSION}


@app.get("/api/geocode")
async def geocode(request: Request, name: str = Query(..., min_length=2, max_length=80), language: str = Query("en", pattern="^(en|my)$"), count: int = Query(8, ge=1, le=10)) -> dict[str, Any]:
    allow_request(request)
    key = f"geo:{' '.join(name.split()).lower()}:{language}:{count}"
    cached = cache_get(geocode_cache, key, GEOCODE_TTL)
    if cached is not None:
        return cached

    async def load():
        data, _ = await fetch_json(GEOCODE_URL, {"name": name, "count": count, "language": language, "format": "json"})
        results = data.get("results") or []
        mm = [x for x in results if x.get("country_code") == "MM"]
        result = {"results": (mm + [x for x in results if x not in mm])[:count]}
        cache_set(geocode_cache, key, result)
        return result

    return await coalesced(key, load)


def weather_params(lat: float, lon: float) -> dict[str, Any]:
    return {"latitude": lat, "longitude": lon, "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,pressure_msl,visibility,wind_speed_10m,wind_direction_10m,is_day", "hourly": "temperature_2m,precipitation_probability,precipitation,weather_code,relative_humidity_2m,wind_speed_10m", "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,weather_code,sunrise,sunset", "forecast_days": 7, "timezone": "auto", "wind_speed_unit": "kmh", "temperature_unit": "celsius", "precipitation_unit": "mm"}


@app.get("/api/weather")
async def weather(request: Request, lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)) -> dict[str, Any]:
    allow_request(request)
    key = f"weather:{lat:.3f}:{lon:.3f}"
    cached = cache_get(weather_cache, key, WEATHER_TTL)
    if cached is not None:
        return cached

    async def load():
        w_task = fetch_json(WEATHER_URL, weather_params(lat, lon))
        a_task = fetch_json(AIR_URL, {"latitude": lat, "longitude": lon, "current": "us_aqi,pm2_5,pm10", "timezone": "auto"})
        weather_result, air_result = await asyncio.gather(w_task, a_task, return_exceptions=True)
        if isinstance(weather_result, Exception):
            if isinstance(weather_result, HTTPException):
                raise weather_result
            raise HTTPException(502, "Weather provider is temporarily unavailable")
        weather_data, _ = weather_result
        air_data = air_result[0] if not isinstance(air_result, Exception) else {}
        result = {"weather": weather_data, "air_quality": air_data, "meta": {"cached": False, "provider": "Open-Meteo"}}
        cache_set(weather_cache, key, result)
        return result

    return await coalesced(key, load)


@app.get("/api/climate")
async def climate(request: Request, lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)) -> dict[str, Any]:
    allow_request(request)
    from datetime import date
    key = f"climate:{lat:.2f}:{lon:.2f}"
    cached = cache_get(climate_cache, key, CLIMATE_TTL)
    if cached is not None:
        return cached
    end = date(date.today().year - 1, 12, 31)
    start = date(end.year - 39, 1, 1)

    async def load():
        data, _ = await fetch_json(NASA_URL, {"parameters": "T2M,PRECTOTCORR", "community": "AG", "longitude": lon, "latitude": lat, "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"), "format": "JSON", "time_standard": "UTC"})
        result = {"source": "NASA POWER", "data": data}
        cache_set(climate_cache, key, result)
        return result

    return await coalesced(key, load)
