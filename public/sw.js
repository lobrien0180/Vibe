const SHELL_CACHE = 'vibe-shell-v2'
const RUNTIME_CACHE = 'vibe-runtime-v2'
const APP_BASE_PATH = self.location.pathname.replace(/[^/]+$/, '')
const APP_SHELL_URLS = [
  '',
  'index.html',
  'app.webmanifest',
  'favicon.svg',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'sample-program-upload.csv',
].map((path) => `${APP_BASE_PATH}${path}`)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => ![SHELL_CACHE, RUNTIME_CACHE].includes(cacheName))
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)

  if (requestUrl.origin !== self.location.origin) {
    return
  }

  event.respondWith(handleRequest(request))
})

async function handleRequest(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE)

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      runtimeCache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    const cachedResponse = await runtimeCache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    if (request.mode === 'navigate') {
      const appShell = await caches.match(`${APP_BASE_PATH}index.html`)

      if (appShell) {
        return appShell
      }
    }

    throw error
  }
}
