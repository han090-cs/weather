from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from datetime import datetime, timedelta

app = FastAPI()

# Frontend ကနေ လှမ်းခေါ်လို့ရအောင် CORS ဖွင့်ပေးခြင်း
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Data များကို ၁၀ မိနစ်စာ ခေတ္တသိမ်းထားရန် Dictionary
cache = {}
CACHE_EXPIRE_MINUTES = 10

@app.get("/api/weather")
async def get_weather(lat: float, lon: float):
    cache_key = f"{lat}_{lon}"
    now = datetime.now()

    # (၁) လွန်ခဲ့သော ၁၀ မိနစ်အတွင်း ရှာထားဖူးရင် Cache ထဲကဟာကိုပဲ ပြန်ပေးမယ်
    if cache_key in cache:
        cached_data, timestamp = cache[cache_key]
        if now - timestamp < timedelta(minutes=CACHE_EXPIRE_MINUTES):
            return cached_data

    # (၂) Cache မရှိရင် Open-Meteo ကနေ အသစ်လှမ်းယူမယ်
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,rain,weather_code,pressure_msl,surface_pressure,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,rain,weather_code,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset,uv_index_max&forecast_days=7&timezone=auto&wind_speed_unit=kmh"
    
    air_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto"

    async with httpx.AsyncClient() as client:
        weather_res = await client.get(weather_url)
        air_res = await client.get(air_url)

        if weather_res.status_code != 200:
            raise HTTPException(status_code=400, detail="API Error")

        final_data = {
            "weather": weather_res.json(),
            "air_quality": air_res.json() if air_res.status_code == 200 else {}
        }

        # (၃) ရလာတဲ့ Data အသစ်ကို Cache ထဲ သိမ်းမယ်
        cache[cache_key] = (final_data, now)

        return final_data
