# Myanmar Weather Dashboard

A free, responsive and bilingual weather dashboard for Myanmar. The interface intentionally avoids complicated region/state selectors: search any city or township directly instead.

## Included

- Minimalist responsive UI for phones, tablets and desktop screens.
- Burmese/English toggle saved in `localStorage`.
- Light/dark theme saved in `localStorage`.
- City/township search through the free Open-Meteo geocoding API.
- Current temperature, feels-like temperature, humidity and wind.
- 24-hour rainfall total and rain probability.
- UV index with a readable risk label.
- US AQI, PM2.5 and PM10 from Open-Meteo Air Quality.
- Seven-day forecast, sunrise, sunset, pressure and visibility.
- Recent locations and current-device location support.
- No API key, paid service or frontend build step required.

## Run locally

Open `weather.html` in a modern browser, or serve the repository with any static server. HTTPS is recommended when using the browser location button.

## Data and accuracy

Weather and air-quality values are model-based forecasts from Open-Meteo. They are not official emergency warnings and should not replace local authority announcements. Rainfall is forecast precipitation in millimetres; AQI and pollutant values are model estimates for the selected coordinate.

## File descriptions

- `weather.html`: accessible page structure, controls and data cards.
- `weather_style.css`: responsive minimalist design, colours and dark theme.
- `weather_script.js`: translation, search, API requests, rendering and saved preferences.
- `main.py`: optional FastAPI proxy kept for future deployments that need server-side caching.
