# Myanmar Weather Dashboard

A bilingual Myanmar weather dashboard using Open-Meteo forecast data and NASA POWER historical climate data.

## Features

- Burmese and English interface
- Myanmar city and township prefix search
- Current weather and seven-day forecast
- Temperature and rainfall charts
- NASA POWER historical climate comparison
- Model-based risk overview
- Heavy-rain, landslide, water-stress, and wind signals
- Hotter / Normal / Cooler status badge
- Dark and light themes
- Recent locations and browser geolocation

## Data interpretation

The dashboard displays model-based guidance, not guaranteed predictions. Hazard cards are early signals calculated from forecast conditions; they are not official emergency warnings. For decisions involving flooding, landslides, drought, or severe weather, users should verify alerts from the relevant local authorities.

## Data sources

- Open-Meteo Forecast API: current conditions and forecast
- Open-Meteo Air Quality API: AQI and particulate matter
- Open-Meteo Geocoding API: location lookup
- NASA POWER: historical temperature and precipitation data

## Run locally

Open `weather.html` in a modern browser, or serve the repository with a local static server. HTTPS is recommended for browser geolocation.
