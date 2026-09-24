const VERSION = "weather-v4";
const SHELL = ["./", "./weather.html", "./weather_style.css", "./weather_script.js", "./manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const api = url.pathname.startsWith("/api/") || url.hostname.includes("open-meteo.com") || url.hostname.includes("larc.nasa.gov");
  if (api) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(VERSION).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && response.type === "basic") caches.open(VERSION).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
