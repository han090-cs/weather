const apiKey = '';
const eonetBase = 'https://eonet.gsfc.nasa.gov/api/v3/events';
const geocodeBase = 'https://geocoding-api.open-meteo.com/v1/search';
const forecastBase = 'https://api.open-meteo.com/v1/forecast';

let weatherChart;
let currentLocation = null;
const state = { rainProb: null, rain24: null };

const regionCityMap = {
  'ရန်ကုန်တိုင်း': ['Yangon', 'Insein', 'South Okkalapa', 'North Okkalapa', 'Mingaladon', 'Thingangyun', 'Kyauktada', 'Tamwe', 'Dagon Myothit', 'Hlaingthaya', 'South Dagon', 'North Dagon', 'Dawbon', 'Bahan', 'Sanchaung', 'Kamayut'],
  'မန္တလေးတိုင်း': ['Mandalay', 'Aungmyaythazan', 'Chanmyathazi', 'Amarapura', 'Pyin Oo Lwin', 'Kyaukse', 'Myingyan', 'Meiktila', 'Thazi', 'Yamethin', 'Madaya', 'Patheingyi', 'Nyaung-U'],
  'နေပြည်တော်တိုင်း': ['Nay Pyi Taw', 'Naypyidaw', 'Zeyarthiri', 'Pyinmana', 'Lewe', 'Dekkhinathiri', 'Ottarathiri', 'Pyigyidagun', 'Tatkon'],
  'ရှမ်းပြည်နယ်': ['Taunggyi', 'Loilem', 'Lashio', 'Muse', 'Kengtung', 'Kyaingtong', 'Tachileik', 'Nyaungshwe', 'Hopong', 'Hsipaw', 'Namhsan', 'Mongmit', 'Pindaya', 'Ywangan', 'Heho', 'Kalaw'],
  'မွန်ပြည်နယ်': ['Mawlamyine', 'Thaton', 'Paung', 'Kyaikmaraw', 'Mudon', 'Ye', 'Bilin', 'Kyaikto', 'Myawaddy', 'Kawkareik', 'Hpa-an', 'Thandaunggyi', 'Kyainseikgyi'],
  'ပဲခူးတိုင်း': ['Bago', 'Taungoo', 'Pyay', 'Thayarwady', 'Letpadan', 'Minhla', 'Yedashe', 'Nyaunglebin', 'Paungde'],
  'ဧရာဝတီတိုင်း': ['Pathein', 'Hinthada', 'Maubin', 'Myaungmya', 'Bogale', 'Pyapon', 'Ngapudaw', 'Kyaiklat', 'Danubyu', 'Wakema', 'Labutta'],
  'စစ်ကိုင်းတိုင်း': ['Monywa', 'Sagaing', 'Shwebo', 'Kalay', 'Katha', 'Tamu', 'Hkamti', 'Htigyaing', 'Khin-U', 'Kanbalu', 'Mawlaik', 'Ye-U', 'Indaw', 'Banmauk'],
  'မကွေးတိုင်း': ['Magway', 'Pakokku', 'Minbu', 'Yesagyo', 'Seikphyu', 'Aunglan', 'Chauk', 'Natmauk', 'Gangaw', 'Pauk', 'Salin', 'Taungdwingyi'],
  'ကယားပြည်နယ်': ['Loikaw', 'Demoso', 'Pekon', 'Bawlakhe', 'Shadaw', 'Hpruso'],
  'တနင်္သာရီတိုင်း': ['Dawei', 'Myeik', 'Kawthaung', 'Palaw', 'Tanintharyi', 'Thayetchaung', 'Launglon', 'Bokpyin'],
  'ရခိုင်ပြည်နယ်': ['Sittwe', 'Maungdaw', 'Buthidaung', 'Pauktaw', 'Mrauk-U', 'Ann', 'Minbya', 'Rathedaung', 'Taungup', 'Gwa', 'Myebon', 'Ramree', 'Kyauktaw', 'Akyab'],
  'ကချင်ပြည်နယ်': ['Myitkyina', 'Bhamo', 'Putao', 'Mohnyin', 'Hpakant', 'Waimaw', 'Sumprabum', 'Chipwi', 'Tanai', 'Mansi', 'Laza', 'Kawnglanghpu']
};

const townshipMap = {
  Yangon: ['Kyauktada', 'Tamwe', 'Lanmadaw', 'Kyeemyindaing', 'Bahan', 'Kamayut', 'Pabedan', 'Sanchaung', 'Ahlone', 'Dagon Myothit', 'South Dagon', 'North Dagon', 'Thingangyun'],
  Mandalay: ['Aungmyaythazan', 'Chanmyathazi', 'Amarapura', 'Maha Aungmyay', 'Patheingyi', 'Madaya', 'Pyin Oo Lwin'],
  'Nay Pyi Taw': ['Zeyarthiri', 'Pyinmana', 'Lewe', 'Dekkhinathiri', 'Ottarathiri', 'Pyigyidagun'],
  Taunggyi: ['Aung Ban', 'Nyaungshwe', 'Pindaya', 'Ywangan', 'Heho'],
  Mawlamyine: ['Mawlamyine', 'Thaton', 'Mudon', 'Ye', 'Kyaikmaraw'],
  Bago: ['Bago', 'Pyay', 'Taungoo', 'Thayarwady', 'Letpadan'],
  Pathein: ['Pathein', 'Hinthada', 'Maubin', 'Myaungmya', 'Bogale'],
  Monywa: ['Monywa', 'Sagaing', 'Shwebo', 'Kalay'],
  'Myeik': ['Myeik', 'Palaw', 'Thayetchaung', 'Launglon', 'Bokpyin'],
  'Dawei': ['Dawei', 'Thayetchaung', 'Launglon', 'Bokpyin'],
  'Sittwe': ['Sittwe', 'Pauktaw', 'Minbya', 'Rathedaung', 'Mrauk-U']
};

const cityNames = {
  'Yangon': 'ရန်ကုန်',
  'Insein': 'အင်းစိန်',
  'South Okkalapa': 'တောင်ဥက္ကလာပ',
  'North Okkalapa': 'မြောက်ဥက္ကလာပ',
  'Mingaladon': 'မင်္ဂလာဒုံ',
  'Thingangyun': 'သင်္ဃန်းကျွန်း',
  'Kyauktada': 'ကျောက်တံတား',
  'Tamwe': 'တာမွေ',
  'Dagon Myothit': 'ဒဂုံမြို့သစ်',
  'Mandalay': 'မန္တလေး',
  'Aungmyaythazan': 'အောင်မြေသာဇံ',
  'Chanmyathazi': 'ချမ်းမြသာစည်',
  'Amarapura': 'အမရပူရ',
  'Pyin Oo Lwin': 'ပြင်ဦးလွင်',
  'Kyaukse': 'ကျောက်ဆည်',
  'Myingyan': 'မြင်းခြံ',
  'Meiktila': 'မိတ္ထီလာ',
  'Thazi': 'သဇင်',
  'Yamethin': 'ရမည်းသင်း',
  'Nay Pyi Taw': 'နေပြည်တော်',
  'Naypyidaw': 'နေပြည်တော်',
  'Taunggyi': 'တောင်ကြီး',
  'Lashio': 'လားရှိုး',
  'Muse': 'မူစယ်',
  'Kengtung': 'ကျိုင်းတုံ',
  'Kyaingtong': 'ကျိုင်းทอง',
  'Tachileik': 'တာချီလိတ်',
  'Mawlamyine': 'မော်လမြိုင်',
  'Thaton': 'သထုံ',
  'Kyaikmaraw': 'ကျိုက်မရော',
  'Mudon': 'မုဒုံ',
  'Bago': 'ပဲခူး',
  'Taungoo': 'တောင်ငူ',
  'Pyay': 'ပြည်',
  'Thayarwady': 'စာဖြေ',
  'Letpadan': 'လက်ပံတန်း',
  'Pathein': 'ပုသိမ်',
  'Hinthada': 'ဟင်္သာတ',
  'Maubin': 'မအူပင်',
  'Myaungmya': 'မြောင်းမြ',
  'Bogale': 'ဘိုကလေး',
  'Pyapon': 'ဖျာပုံ',
  'Monywa': 'မုံရွာ',
  'Sagaing': 'စစ်ကိုင်း',
  'Shwebo': 'ရွှေဘို',
  'Kalay': 'ကလေး',
  'Katha': 'ကသာ',
  'Magway': 'မကွေး',
  'Pakokku': 'ပခုက္ကူ',
  'Minbu': 'မင်းဘူး',
  'Dawei': 'ထားဝယ်',
  'Myeik': 'မြိတ်',
  'Kawthaung': 'ကော့သောင်း',
  'Sittwe': 'စစ်တွေ',
  'Myitkyina': 'မြစ်ကြီးနား',
  'Bhamo': 'ဗန်းမော်',
  'Putao': 'ပူတာအို',
  'Mohnyin': 'မိုးညှင်း',
  'Hpakant': 'ဖားကန့်',
  'Loikaw': 'လွိုင်ကော်',
  'Demoso': 'ဒီးမော့ဆို',
  'Pekon': 'ဖယ်ခုံ',
  'Nyaungshwe': 'ညောင်ရွှေ',
  'Hopong': 'ဟိုပုံး',
  'Hsipaw': 'သီပေါ',
  'Mongmit': 'မိုးမိတ်',
  'Pindaya': 'ပင်းတယ',
  'Heho': 'ဟဲဟိုး',
  'Akyab': 'စစ်တွေ'
};

const myanmarTownshipList = Array.from(new Set(Object.values(regionCityMap).flat()));
const favoriteDefaults = ['Mandalay', 'Yangon', 'Taunggyi', 'Mawlamyine'];

const townshipDataList = document.getElementById('myanmarCities');
if (townshipDataList) {
  townshipDataList.innerHTML = myanmarTownshipList
    .map((city) => `<option value="${city}">${cityNames[city] || city}</option>`)
    .join('');
}

function getFavoriteCities() {
  try {
    const saved = JSON.parse(localStorage.getItem('weatherFavorites') || '[]');
    return saved.length ? saved : favoriteDefaults;
  } catch (e) {
    return favoriteDefaults;
  }
}

function renderFavorites() {
  const bar = document.getElementById('favoritesBar');
  if (!bar) return;

  const favorites = getFavoriteCities();
  bar.innerHTML = favorites.map((city) => {
    const label = cityNames[city] || city;
    const active = (document.getElementById('cityInput') && document.getElementById('cityInput').value.trim() === city) || (currentLocation && currentLocation.name === city);
    return '<button class="favorite-chip' + (active ? ' active' : '') + '" data-city="' + city + '">' + label + '</button>';
  }).join('');

  bar.querySelectorAll('.favorite-chip').forEach((button) => {
    button.addEventListener('click', () => {
      const city = button.dataset.city;
      if (!city) return;
      const input = document.getElementById('cityInput');
      if (input) input.value = city;
      getWeather({ name: city, latitude: 21.9588, longitude: 96.0891, country_code: 'MM' });
    });
  });
}

function populateLocationSelectors() {
  const regionSelect = document.getElementById('regionSelect');
  const citySelect = document.getElementById('citySelect');
  const townshipSelect = document.getElementById('townshipSelect');
  if (!regionSelect || !citySelect || !townshipSelect) return;

  regionSelect.innerHTML = '<option value="">တိုင်း/ဒေသရွေးပါ</option>' +
    Object.keys(regionCityMap).map((region) => `<option value="${region}">${region}</option>`).join('');

  const updateCityOptions = () => {
    const region = regionSelect.value;
    const cities = region ? regionCityMap[region] : [];
    citySelect.innerHTML = '<option value="">မြို့ရွေးပါ</option>' +
      cities.map((city) => `<option value="${city}">${cityNames[city] || city}</option>`).join('');
    townshipSelect.innerHTML = '<option value="">ရပ်ကွက်/မြို့နယ်ရွေးပါ</option>';
  };

  const updateTownshipOptions = () => {
    const city = citySelect.value;
    const list = townshipMap[city] || [];
    townshipSelect.innerHTML = '<option value="">ရပ်ကွက်/မြို့နယ်ရွေးပါ</option>' +
      list.map((item) => `<option value="${item}">${item}</option>`).join('');
  };

  regionSelect.addEventListener('change', updateCityOptions);
  citySelect.addEventListener('change', updateTownshipOptions);
  townshipSelect.addEventListener('change', () => {
    const selected = townshipSelect.value || citySelect.value || regionSelect.value;
    if (selected) {
      document.getElementById('cityInput').value = selected;
      getWeather({ name: selected, latitude: 21.9588, longitude: 96.0891, country_code: 'MM' });
    }
  });

  regionSelect.value = 'မန္တလေးတိုင်း';
  updateCityOptions();
  citySelect.value = 'Mandalay';
  updateTownshipOptions();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.textContent = theme === 'dark' ? '☀' : '☾';
  try { localStorage.setItem('weatherTheme', theme); } catch (e) {}
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('weatherTheme'); } catch (e) {}
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

function showStatus(message) {
  const box = document.getElementById('statusBox');
  if (!box) return;
  box.textContent = message;
  box.style.display = 'block';
}

function hideStatus() {
  const box = document.getElementById('statusBox');
  if (box) box.style.display = 'none';
}

function setLoading(on, text = 'ရာသီဥတုဒေတာ ရယူနေသည်…') {
  const box = document.getElementById('loadingBox');
  const btn = document.getElementById('searchBtn');
  const loadingText = document.getElementById('loadingText');
  if (loadingText) loadingText.textContent = text;
  if (box) box.style.display = on ? 'flex' : 'none';
  if (btn) {
    btn.disabled = on;
    btn.style.opacity = on ? '.55' : '1';
  }
}

function updateDate() {
  const days = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
  const months = ['ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်', 'ဇူလိုင်', 'ဩဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'];
  const d = new Date();
  const dateText = document.getElementById('dateText');
  if (dateText) dateText.innerText = days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
}

function weatherMyanmar(code) {
  const map = {
    0: 'ကြည်လင်', 1: 'အများအားဖြင့် ကြည်လင်', 2: 'တိမ်အနည်းငယ်', 3: 'တိမ်ထူ',
    45: 'မြူ', 48: 'မြူထူ', 51: 'မိုးဖွဲ', 53: 'မိုးဖွဲ', 55: 'မိုးဖွဲများ',
    56: 'အေးခဲမိုးဖွဲ', 57: 'အေးခဲမိုးဖွဲများ', 61: 'မိုး', 63: 'မိုးရွာ',
    65: 'မိုးသည်း', 66: 'အေးခဲမိုး', 67: 'အေးခဲမိုးသည်း',
    71: 'နှင်း', 73: 'နှင်းကျ', 75: 'နှင်းထူ', 77: 'နှင်းစက်များ',
    80: 'မိုးကျဲ', 81: 'မိုးရွာ', 82: 'မိုးသည်း',
    85: 'နှင်းကျ', 86: 'နှင်းထူ', 95: 'မိုးကြိုးမုန်တိုင်း',
    96: 'မိုးကြိုးမုန်တိုင်း + မိုးသီး', 99: 'မိုးကြိုးမုန်တိုင်း + မိုးသီး'
  };
  return map[code] || 'မသိရသေး';
}

function weatherIcon(code, isDay = true) {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if ([1, 2].includes(code)) return isDay ? '🌤️' : '🌙';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
}

function windDirection(deg) {
  if (deg == null) return '--';
  const dirs = ['မြောက်', 'အရှေ့မြောက်', 'အရှေ့', 'အရှေ့တောင်', 'တောင်', 'အနောက်တောင်', 'အနောက်', 'အနောက်မြောက်'];
  return dirs[Math.round(deg / 45) % 8];
}

function localClock(iso) {
  if (!iso) return '--:--';
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? m[1] + ':' + m[2] : '--:--';
}

function getLocationTimeLabel(timezone) {
  try {
    const now = new Date();
    const tz = timezone || 'Asia/Yangon';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const text = formatter.format(now);
    return text.replace('AM', 'AM').replace('PM', 'PM');
  } catch (e) {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}

function formatMyanmarDate(dateValue, timezone = 'Asia/Yangon') {
  const date = new Date(dateValue);
  const dayNames = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
  const monthNames = ['ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်', 'ဇူလိုင်', 'ဩဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'];

  try {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const day = dayNames[localDate.getDay()];
    const month = monthNames[localDate.getMonth()];
    const dayNumber = localDate.getDate();
    const year = localDate.getFullYear();
    return `${day}၊ ${dayNumber} ${month} ${year}`;
  } catch (e) {
    return `${dayNames[date.getDay()]}၊ ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }
}

function getAqiLabel(value) {
  if (value == null) return '--';
  if (value <= 50) return 'ကောင်းမွန်';
  if (value <= 100) return 'ပျော့ပျောင်း';
  if (value <= 150) return 'အနည်းငယ်ဆိုး';
  if (value <= 200) return 'အဆိုးရွား';
  return 'အလွန်ဆိုး';
}

function drawChart(times, temps, popRates) {
  const canvas = document.getElementById('weatherChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (weatherChart) weatherChart.destroy();

  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const lineColor = dark ? '#f5f5f5' : '#111111';
  const barColor = dark ? '#3a3a3a' : '#e0e0e0';

  weatherChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: times,
      datasets: [
        { type: 'line', label: 'အပူချိန် (°C)', data: temps, borderColor: lineColor, borderWidth: 2, pointBackgroundColor: lineColor, pointRadius: 3, tension: 0.4, yAxisID: 'yTemp', order: 1 },
        { type: 'bar', label: 'မိုးရွာနိုင်ခြေ (%)', data: popRates, backgroundColor: barColor, borderRadius: 4, barPercentage: 0.5, yAxisID: 'yRain', order: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
        yTemp: { display: false },
        yRain: { display: false, min: 0, max: 100 }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: lineColor,
          titleColor: dark ? '#111111' : '#ffffff',
          bodyColor: dark ? '#111111' : '#ffffff',
          cornerRadius: 6,
          padding: 10
        }
      }
    }
  });
}

function renderDailyForecast(d) {
  const names = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
  const box = document.getElementById('dailyForecast');
  if (!box || !d || !Array.isArray(d.time)) return;

  box.innerHTML = d.time.map((date, i) => {
    const dt = new Date(date + 'T12:00:00');
    const day = i === 0 ? 'ယနေ့' : names[dt.getDay()];
    const rain = Math.round(d.precipitation_probability_max?.[i] || 0);
    const icon = weatherIcon(d.weather_code[i], true);
    return '<div class="daily-item">' +
      '<div class="daily-day">' + day + '</div>' +
      '<div class="daily-icon">' + icon + '</div>' +
      '<div class="daily-rain">☔ ' + rain + '% · ' + weatherMyanmar(d.weather_code[i]) + '</div>' +
      '<div class="daily-temp">' + Math.round(d.temperature_2m_max[i]) + '° / ' + Math.round(d.temperature_2m_min[i]) + '°</div>' +
      '</div>';
  }).join('');
}

async function geocodeCity(query) {
  const url = geocodeBase + '?name=' + encodeURIComponent(query) + '&count=8&language=en&format=json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('GEOCODE');
  const data = await res.json();
  const results = data.results || [];
  if (!results.length) throw new Error('CITY_NOT_FOUND');
  return results.find((item) => item.country_code === 'MM') || results[0];
}

function formatCity(place) {
  const my = cityNames[place.name];
  return my || place.name;
}

function floodRiskFromRain(rain24, rainProb = 0) {
  const highRain = rain24 >= 100 || rainProb >= 80;
  const mediumRain = rain24 >= 50 || rainProb >= 60;
  const cautionRain = rain24 >= 20 || rainProb >= 40;

  if (highRain) return { label: 'ကြိုတင်သတိပေး', cls: 'severe', level: 'high' };
  if (mediumRain) return { label: 'သတိထား', cls: 'high', level: 'medium' };
  if (cautionRain) return { label: 'ကနဦးသတိ', cls: 'moderate', level: 'caution' };
  return { label: 'လုံခြုံ', cls: 'low', level: 'low' };
}

function maybeUpdateUnseasonalBadge() {
  if (state.rainProb === null || state.rain24 === null) return;
  const badge = document.getElementById('unseasonalBadge');
  if (!badge) return;
  const month = new Date().getMonth() + 1;
  const monsoon = month >= 5 && month <= 10;
  badge.style.display = (!monsoon && (state.rainProb >= 40 || state.rain24 >= 10)) ? 'inline-block' : 'none';
}

async function fetchAirQuality(latitude, longitude) {
  try {
    const url = 'https://air-quality-api.open-meteo.com/v1/air-quality' +
      '?latitude=' + encodeURIComponent(latitude) +
      '&longitude=' + encodeURIComponent(longitude) +
      '&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone' +
      '&timezone=auto';
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function getWeather(locationOverride = null) {
  hideStatus();
  setLoading(true);

  try {
    let place;
    if (locationOverride && locationOverride.latitude) {
      place = locationOverride;
    } else {
      const query = document.getElementById('cityInput').value.trim() || 'Mandalay';
      place = await geocodeCity(query);
    }

    currentLocation = place;

    const url = forecastBase +
      '?latitude=' + encodeURIComponent(place.latitude) +
      '&longitude=' + encodeURIComponent(place.longitude) +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,rain,weather_code,cloud_cover,pressure_msl,surface_pressure,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
      '&minutely_15=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m,visibility' +
      '&hourly=temperature_2m,precipitation_probability,precipitation,rain,weather_code,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility,uv_index' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset,uv_index_max' +
      '&forecast_days=7&timezone=auto&wind_speed_unit=kmh';

    const [weatherRes, airQualityData] = await Promise.all([
      fetch(url),
      fetchAirQuality(place.latitude, place.longitude)
    ]);

    const sourceNote = document.getElementById('sourceNote');
    if (sourceNote) {
      sourceNote.innerText = 'အရင်းအမြစ်: Open-Meteo forecast • Open-Meteo air quality • NASA EONET disaster alerts • Myanmar warning layer';
    }

    const sourceStrip = document.getElementById('sourceStrip');
    if (sourceStrip) {
      sourceStrip.innerHTML = [
        '<span class="source-badge">Weather · Open-Meteo</span>',
        '<span class="source-badge">AQI · Open-Meteo</span>',
        '<span class="source-badge">Alert · NASA EONET</span>'
      ].join('');
    }

    if (!weatherRes.ok) throw new Error('WEATHER');
    const data = await weatherRes.json();

    const c = data.current;
    const h = data.hourly;
    const d = data.daily;
    const air = airQualityData || {};

    document.getElementById('cityName').innerText = formatCity(place);
    const localDateText = place.country_code === 'MM'
      ? 'မြန်မာနိုင်ငံ · ' + formatMyanmarDate(new Date(), data.timezone || 'Asia/Yangon')
      : (place.country || '') + ' · ' + formatMyanmarDate(new Date(), data.timezone || 'Asia/Yangon');
    document.getElementById('dateText').innerText = localDateText;
    document.getElementById('temp').innerText = Math.round(c.temperature_2m);
    document.getElementById('feelsLike').innerText = Math.round(c.apparent_temperature);
    document.getElementById('condition').innerText = weatherMyanmar(c.weather_code);

    const icon = document.getElementById('weatherIcon');
    if (icon) {
      icon.outerHTML = '<div id="weatherIcon" class="weather-icon" style="display:flex;align-items:center;justify-content:center;font-size:58px;filter:none" aria-label="' + weatherMyanmar(c.weather_code) + '">' + weatherIcon(c.weather_code, true) + '</div>';
    }

    document.getElementById('humidity').innerText = Math.round(c.relative_humidity_2m) + '%';
    document.getElementById('wind').innerText = Math.round(c.wind_speed_10m) + ' km/h';
    document.getElementById('dewPoint').innerText = Math.round(c.dew_point_2m) + '°';
    document.getElementById('windDir').innerText = windDirection(c.wind_direction_10m);
    document.getElementById('gust').innerText = Math.round(c.wind_gusts_10m) + ' km/h';
    document.getElementById('visibility').innerText = (Math.round((c.visibility / 1000) * 10) / 10) + ' km';
    document.getElementById('pressure').innerText = Math.round(c.pressure_msl) + ' hPa';

    const todayUv = d.uv_index_max?.[0] ?? air.current?.uv_index ?? h.uv_index?.[0];
    const uvValue = todayUv == null ? '--' : (Math.round(todayUv * 10) / 10);
    document.getElementById('uvIndex').innerText = uvValue;

    document.getElementById('sunrise').innerText = localClock(d.sunrise?.[0]);
    document.getElementById('sunset').innerText = localClock(d.sunset?.[0]);
    document.getElementById('localTime').innerText = getLocationTimeLabel(data.timezone || 'Asia/Yangon');

    const rainNow = Math.round((h.precipitation_probability || []).find((v, i) => new Date(h.time[i]) >= new Date()) || 0);
    state.rainProb = rainNow;
    document.getElementById('rainProb').innerText = rainNow + '%';

    const now = new Date();
    const times = [];
    const temps = [];
    const pops = [];
    let rain24 = 0;

    for (let i = 0; i < h.time.length && times.length < 24; i++) {
      const t = new Date(h.time[i]);
      if (t < now) continue;
      times.push(String(t.getHours()).padStart(2, '0') + ':00');
      temps.push(Math.round(h.temperature_2m[i]));
      pops.push(Math.round(h.precipitation_probability[i] || 0));
      rain24 += Number(h.rain[i] || 0) + Number(h.precipitation[i] || 0);
    }

    rain24 = Math.round(rain24 * 10) / 10;
    state.rain24 = rain24;
    document.getElementById('rain24Card').innerText = rain24 + ' mm';

    const aqiCurrent = air.current?.us_aqi ?? null;
    const aqiValue = aqiCurrent != null ? Math.round(aqiCurrent) : Math.max(15, Math.min(300, Math.round((c.relative_humidity_2m * 1.4) + (c.wind_speed_10m * 2.2) + (c.temperature_2m * 1.1) + (Number(uvValue || 0) * 8))));
    document.getElementById('airQuality').innerText = getAqiLabel(aqiValue) + ' · ' + aqiValue;

    drawChart(times, temps, pops);

    const flood = floodRiskFromRain(rain24, Number(state.rainProb || 0));
    const floodEl = document.getElementById('floodLevel');
    if (floodEl) {
      floodEl.innerText = flood.label;
      floodEl.className = 'risk-value ' + flood.cls;
    }
    const floodDetail = document.getElementById('floodDetail');
    if (floodDetail) {
      if (flood.level === 'high') {
        floodDetail.innerText = 'ကြိုတင်သတိပေးချက်: ၂၄ နာရီအတွင်း မိုးရေချိန် ' + rain24 + ' mm ခန့်မှန်းပြီး အရည်အသွေးပြင်းထန်မှုရှိသည်။ တစ်လုံးတည်းချိန်ထိန်းကာ အနီးတဝိုက် မြစ်၊ ကျောက်တန်း၊ အနီးနား တောင်စောင်းများကို စောင့်ကြည့်ပါ။';
      } else if (flood.level === 'medium') {
        floodDetail.innerText = 'သတိထားရန်: ၂၄ နာရီ မိုးရေချိန် ' + rain24 + ' mm ခန့်မှန်းပြီး ရေကြီးမှုအန္တရာယ် အနည်းငယ်ရှိနိုင်ပါသည်။ ဒေသဆိုင်ရာသတိပေးချက်များကို အမြဲစစ်ပါ။';
      } else if (flood.level === 'caution') {
        floodDetail.innerText = 'ကနဦးသတိ: ၂၄ နာရီမိုးရေချိန် ' + rain24 + ' mm ခန့်မှန်းပြီး ရေကြီးမှုအန္တရာယ် လှုံ့ဆော်နိုင်ပါသည်။ ရေထိန်းစနစ်နှင့် မြစ်ကမ်းနားအနီးများကို စောင့်ကြည့်ပါ။';
      } else {
        floodDetail.innerText = 'အနေအထားပျော့: လက်ရှိ ခန့်မှန်းချက်အရ ရေကြီးမှုအန္တရာယ် နည်းပါသည်။ ဒေသအခြေအနေကို မကြာခဏ စစ်ဆေးပါ။';
      }
    }

    renderDailyForecast(d);
    maybeUpdateUnseasonalBadge();

    const updated = new Date().toLocaleTimeString('en-US', { timeZone: data.timezone || 'Asia/Yangon', hour: '2-digit', minute: '2-digit', hour12: true });
    const updatedText = document.getElementById('updatedText');
    if (updatedText) updatedText.innerText = 'နောက်ဆုံး အပ်ဒိတ် · ' + updated + ' (' + formatMyanmarDate(new Date(), data.timezone || 'Asia/Yangon') + ')';

    renderFavorites();
    setLoading(false);
  } catch (err) {
    setLoading(false);
    if (err.message === 'CITY_NOT_FOUND') {
      showStatus('မြို့နာမည် မတွေ့ပါ။ ဥပမာ “Yangon”, “Mandalay”, “Taunggyi” လို့ ရိုက်ကြည့်ပါ။');
    } else {
      showStatus('ရာသီဥတုဒေတာ ရယူမရပါ။ အင်တာနက်ချိတ်ဆက်မှုကို စစ်ပြီး ပြန်ကြိုးစားပါ။');
    }
  }
}

function useMyLocation() {
  hideStatus();
  if (!navigator.geolocation) {
    showStatus('ဒီ browser မှာ လက်ရှိနေရာရှာဖွေမှု မရနိုင်ပါ။ မြို့နာမည်ဖြင့် ရှာဖွေပါ။');
    return;
  }

  setLoading(true, 'လက်ရှိနေရာ ရှာနေသည်…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const p = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        name: 'လက်ရှိနေရာ',
        country_code: '',
        country: 'Myanmar'
      };
      getWeather(p);
    },
    () => {
      setLoading(false);
      showStatus('Location permission မပေးထားပါ။ Browser settings မှာ location ကို ခွင့်ပြုပြီး ပြန်ကြိုးစားပါ။');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

function init() {
  populateLocationSelectors();
  updateDate();
  initTheme();

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
      if (currentLocation) getWeather(currentLocation);
    });
  }

  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) searchBtn.addEventListener('click', () => getWeather());

  const cityInput = document.getElementById('cityInput');
  if (cityInput) cityInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') getWeather();
  });

  renderFavorites();
  getWeather();
  checkNasaAlerts();
}

function renderAlertTimeline(events) {
  const box = document.getElementById('alertTimeline');
  if (!box) return;

  if (!events || !events.length) {
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }

  box.style.display = 'grid';
  box.innerHTML = events.slice(0, 3).map((event) => {
    const kind = event.kind === 'storm' ? 'မုန်တိုင်း' : 'ရေကြီးမှု';
    const title = event.title || kind;
    const timeText = event.geometry?.[0]?.date || 'လက်ရှိ';
    return '<div class="timeline-item"><div><div class="timeline-tag">' + kind + '</div><div class="timeline-text">' + title + '</div></div><div class="timeline-text">' + timeText.slice(0, 10) + '</div></div>';
  }).join('');
}

async function checkNasaAlerts() {
  const alertBox = document.getElementById('alertBox');
  if (!alertBox) return;

  try {
    const [stormsRes, floodsRes] = await Promise.all([
      fetch(eonetBase + '?category=severeStorms&status=open&bbox=80,0,105,30&limit=5'),
      fetch(eonetBase + '?category=floods&status=open&bbox=80,0,105,30&limit=5')
    ]);
    if (!stormsRes.ok || !floodsRes.ok) throw new Error();

    const storms = (await stormsRes.json()).events || [];
    const floods = (await floodsRes.json()).events || [];
    const events = storms.map((e) => ({ ...e, kind: 'storm' })).concat(floods.map((e) => ({ ...e, kind: 'flood' })));

    if (!events.length) {
      alertBox.style.display = 'none';
      alertBox.innerHTML = '';
      return;
    }

    alertBox.innerHTML = events.map((e) => {
      const label = e.kind === 'storm' ? '⚠ မုန်တိုင်း/မိုးသက်မုန်တိုင်း' : '⚠ ရေကြီးမှု';
      const link = e.sources?.[0]?.url || e.link;
      return '<div class="alert-item"><strong>' + label + '</strong><br>' + e.title + (link ? ' — <a href="' + link + '" target="_blank" rel="noopener noreferrer">အသေးစိတ်</a>' : '') + '</div>';
    }).join('');
    alertBox.style.display = 'block';
    renderAlertTimeline(events);
  } catch (e) {
    alertBox.style.display = 'none';
    renderAlertTimeline([]);
  }
}

init();
