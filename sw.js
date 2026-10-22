const CACHE = "satr-v1"
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./src/app.css",
  "./src/app.js",
  "./src/stabilize.js",
  "./icons/192.png",
  "./icons/512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)))
})
