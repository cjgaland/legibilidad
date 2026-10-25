// ============================================================
//  sw.js — Service Worker · Legibilidad
//  Network-first con caché para uso sin conexión. Al cambiar cualquier
//  archivo, incrementa CACHE_NAME. Solo borra sus propias cachés
//  (prefijo «legibilidad-»), para no borrar las de las apps hermanas
//  que comparten origen.
// ============================================================
const CACHE_NAME = "legibilidad-v3";
const ASSETS = ["./", "./index.html", "./styles.css", "./legibilidad.css", "./xlsx.js", "./docx.js", "./logic.js", "./lector.js", "./vendor/pdfjs-6.4.299/pdf.min.mjs", "./vendor/pdfjs-6.4.299/pdf.worker.min.mjs", "./contenido.js", "./app.js", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-180.png", "./favicon-32.png", "./favicon-16.png", "./icon-512.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("legibilidad-") && k !== CACHE_NAME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    if (response && response.status === 200 && response.type === "basic") { const c = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, c)); }
    return response;
  }).catch(() => caches.match(event.request, { ignoreSearch: true })));
});
