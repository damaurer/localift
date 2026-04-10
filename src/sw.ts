/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

const SHARE_CACHE = 'localift-pending-share';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING')
    self.skipWaiting()
})

// Claim all open clients immediately on activation so COOP/COEP headers
// apply to the current page without needing a manual navigation.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get('file') as File | null;
          if (file) {
            const text = await file.text();
            const cache = await caches.open(SHARE_CACHE);
            await cache.put('/pending-share', new Response(text, {
              headers: { 'Content-Type': 'application/json' },
            }));
          }
        } catch {
          // ignore parse errors — app will handle empty cache
        }
        return Response.redirect('/?import=pending', 303);
      })()
    );
  }
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const screen = event.notification.data?.screen ?? 'dashboard';
  const url = `/?screen=${screen}`;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', screen });
          return;
        }
      }
      self.clients.openWindow(url);
    })
  );
});

// self.__WB_MANIFEST is the default injection point
precacheAndRoute(self.__WB_MANIFEST)

// clean old assets
cleanupOutdatedCaches()

/** @type {RegExp[] | undefined} */
let allowlist
// in dev mode, we disable precaching to avoid caching issues
if (import.meta.env.DEV)
  allowlist = [/^\/$/]

// Serve index.html for all navigation requests, with COOP/COEP headers
// injected so the page becomes cross-origin isolated and SharedArrayBuffer
// (required by wllama multi-threading) is available.
const navigationHandler = createHandlerBoundToURL('index.html')

registerRoute(new NavigationRoute(
  async (options) => {
    const response = await navigationHandler(options)
    const headers = new Headers(response.headers)
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
  { allowlist },
))
