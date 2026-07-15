// =============================================================================
// VOTE 2026 — Service Worker
// Network-first strategy: always try network, fall back to cache for offline.
// =============================================================================

const CACHE_NAME = "vote-2026-v1";

// App shell assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
];

// ─── Install: pre-cache app shell + skip waiting ───────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

// ─── Activate: delete old caches, take control ─────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// ─── Fetch: network-first, cache fallback ──────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Don't cache Supabase API calls
  if (event.request.url.includes("supabase.co")) return;

  event.respondWith(
    (async () => {
      try {
        // Try network first
        const response = await fetch(event.request);

        // If it's a navigation request, cache the response
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, clone);
        }

        return response;
      } catch {
        // Network failed — try cache
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // For navigation requests, return the cached index.html
        if (event.request.mode === "navigate") {
          const fallback = await caches.match("/index.html");
          if (fallback) return fallback;
        }

        // Nothing available — return offline page
        return new Response("Offline — voting system unavailable", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" },
        });
      }
    })()
  );
});
