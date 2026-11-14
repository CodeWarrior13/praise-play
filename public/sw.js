/*
 * Praise Play service worker: makes the site installable and quick to reopen.
 * - Pages: network first, so updates show up straight away; cached copy if offline.
 * - Built files (/assets/, hashed names), icons, manifests: cache first.
 * - catalog.json: served from cache instantly, refreshed in the background.
 * - Leaderboard API, Apple audio and artwork: always live, never cached here.
 */
const VERSION = 'praise-play-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(['./', './catalog.json'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

async function networkFirst(request) {
  const cache = await caches.open(VERSION)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || (await cache.match('./')) || Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION)
  const hit = await cache.match(request)
  const fresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => hit)
  return hit || fresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  if (request.mode === 'navigate') event.respondWith(networkFirst(request))
  else if (url.pathname.endsWith('/catalog.json')) event.respondWith(staleWhileRevalidate(request))
  else if (url.pathname.includes('/assets/') || url.pathname.includes('/icons/') || url.pathname.endsWith('.webmanifest')) event.respondWith(cacheFirst(request))
})
