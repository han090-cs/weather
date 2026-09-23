# Production scaling notes

The static frontend can run on GitHub Pages or a CDN. For many users, deploy the optional FastAPI service from `main.py` behind a CDN and configure `REDIS_URL` with a shared Redis instance.

## Why this scales better

- One background worker refreshes NASA EONET/GDACS alerts every five minutes instead of every visitor calling those providers.
- Weather and air-quality responses are cached for ten minutes by rounded coordinate, so nearby users share a response.
- Redis shares cache data across multiple API instances; local memory remains only a development fallback.
- A shared HTTP connection pool, provider timeouts, health endpoint and request limit prevent common failure modes.
- `Dockerfile` and `render.yaml` provide a simple deployment starting point.

## Required production settings

```text
REDIS_URL=redis://...
ALLOWED_ORIGINS=https://your-domain.example
CACHE_TTL_SECONDS=600
ALERT_TTL_SECONDS=300
```

Use a managed Redis service, a persistent monitoring system, HTTPS, and an official local warning feed before presenting alerts as an emergency service. Public NASA/GDACS feeds can be delayed or incomplete. The dashboard must continue to label all model/event data as informational.

## Recommended next operational steps

1. Deploy the API and Redis in the same region.
2. Point the frontend's `/api/weather` and `/api/alerts` requests at the API domain, or proxy `/api/*` through the CDN.
3. Add Sentry/log aggregation and uptime checks for `/healthz`.
4. Add database-backed alert history and an admin verification workflow.
5. Add Web Push/Telegram notifications only after validating alerts against official authorities.
