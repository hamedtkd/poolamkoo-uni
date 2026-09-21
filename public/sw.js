const CACHE = "poolamkoo-v71";
const OFFLINE_RELEASE = "v86";
const RUNTIME_CACHE = `poolamkoo-offline-${OFFLINE_RELEASE}`;
const SCOPE_CACHE = "poolamkoo-offline-scope";
const SCOPE_MARKER = "/__poolamkoo_active_scope__";
const WORKSPACE_CACHE_PREFIX = `${RUNTIME_CACHE}-workspace-`;
const STATIC_SHELL_ASSETS = [
  "/app.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-512.png",
  "/logo-poolamkoo.svg",
  "/brand/poolamkoo-mark.svg",
];
const WORKSPACE_ROUTES = [
  "/dashboard",
  "/activity",
  "/income",
  "/funds",
  "/investments",
  "/reports",
  "/settings",
  "/settings/general",
  "/settings/money",
  "/settings/market",
  "/settings/data",
  "/settings/privacy",
  "/settings/transfer",
  "/settings/about",
  "/account",
];
const WORKSPACE_NAVIGATION_PREFIXES = ["/dashboard", "/activity", "/income", "/funds", "/investments", "/reports", "/settings", "/account"];
const STATIC_FILE_RE = /\.(?:js|css|woff2?|ttf|otf|svg|png|jpe?g|webp|avif|ico)$/i;
let memoryScope = null;

function isWorkspaceNavigation(pathname) {
  return pathname === "/offline" || WORKSPACE_NAVIGATION_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAppStaticAsset(pathname) {
  return pathname.startsWith("/_next/static/")
    || pathname.startsWith("/_next/image")
    || pathname === "/app.webmanifest"
    || STATIC_FILE_RE.test(pathname);
}

function isCriticalBuildAsset(pathname) {
  return pathname.startsWith("/_next/static/");
}

function safeScope(scope) {
  return typeof scope === "string" ? scope.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : "";
}

function workspaceCacheName(scope) {
  return `${WORKSPACE_CACHE_PREFIX}${safeScope(scope)}`;
}

async function setActiveScope(scope) {
  const next = safeScope(scope);
  if (!next) return false;
  memoryScope = next;
  const cache = await caches.open(SCOPE_CACHE);
  await cache.put(SCOPE_MARKER, new Response(next, { headers: { "Content-Type": "text/plain" } }));
  return true;
}

async function readLegacyScope() {
  const keys = await caches.keys();
  const candidates = keys.filter((key) => /^poolamkoo-offline-v\d+$/.test(key)).reverse();
  for (const key of candidates) {
    const response = await (await caches.open(key)).match(SCOPE_MARKER);
    const stored = safeScope(response ? await response.text() : "");
    if (stored) return stored;
  }
  return "";
}

async function activeScope() {
  if (memoryScope) return memoryScope;
  const cache = await caches.open(SCOPE_CACHE);
  const response = await cache.match(SCOPE_MARKER);
  let stored = safeScope(response ? await response.text() : "");
  if (!stored) {
    stored = await readLegacyScope();
    if (stored) await setActiveScope(stored);
  }
  memoryScope = stored || null;
  return memoryScope;
}

async function clearActiveWorkspace() {
  const scope = await activeScope();
  if (scope) {
    const suffix = `-workspace-${scope}`;
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("poolamkoo-offline-") && key.endsWith(suffix)).map((key) => caches.delete(key)));
  }
  memoryScope = null;
  const cache = await caches.open(SCOPE_CACHE);
  await cache.delete(SCOPE_MARKER);
}

function requestForPath(path, scope) {
  const headers = { accept: "text/html" };
  if (scope) headers["x-poolamkoo-scope"] = safeScope(scope);
  return new Request(new URL(path, self.location.origin).href, {
    method: "GET",
    headers,
    credentials: "include",
  });
}

function cleanNavigationRequest(request) {
  const url = new URL(request.url);
  return requestForPath(url.pathname);
}

function extractStaticAssetUrls(text, baseUrl, css = false) {
  const urls = new Set();
  const pattern = css ? /url\((?:["']?)([^"')]+)(?:["']?)\)/g : /(?:src|href)=["']([^"'#]+)["']/g;
  for (const match of text.matchAll(pattern)) {
    const value = match[1]?.trim();
    if (!value || value.startsWith("data:")) continue;
    let decoded = value;
    try { decoded = decodeURIComponent(value); } catch { /* Keep original. */ }
    if (decoded.startsWith("#") || decoded.startsWith("\\#")) continue;
    try {
      const url = new URL(value, baseUrl);
      if (url.origin === self.location.origin && isAppStaticAsset(url.pathname)) urls.add(url.href);
    } catch {
      // Ignore malformed references in HTML/CSS we do not control.
    }
  }
  return [...urls];
}

async function cacheStaticAsset(url, required = false) {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const request = new Request(url, { credentials: "same-origin" });
  const cached = await runtimeCache.match(request) || await caches.match(request);
  if (cached) {
    if (!await runtimeCache.match(request)) await runtimeCache.put(request, cached.clone());
    return;
  }

  let response;
  try {
    response = await fetch(request);
  } catch (error) {
    if (required) throw error;
    return;
  }
  if (!response.ok) {
    if (required) throw new Error(`offline asset ${request.url} returned ${response.status}`);
    return;
  }
  await runtimeCache.put(request, response.clone());

  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/css")) return;
  const css = await response.clone().text();
  const nested = extractStaticAssetUrls(css, response.url || url, true);
  const critical = nested.filter((assetUrl) => isCriticalBuildAsset(new URL(assetUrl).pathname));
  const optional = nested.filter((assetUrl) => !isCriticalBuildAsset(new URL(assetUrl).pathname));
  await Promise.all(critical.map((assetUrl) => cacheStaticAsset(assetUrl, required)));
  await Promise.allSettled(optional.map((assetUrl) => cacheStaticAsset(assetUrl, false)));
}

async function cacheDocumentAssets(response, baseUrl, required = false) {
  const type = response.headers.get("content-type") || "";
  if (!response.ok || !type.includes("text/html")) {
    if (required) throw new Error(`offline document ${baseUrl} is not cacheable HTML`);
    return;
  }
  const html = await response.clone().text();
  const urls = extractStaticAssetUrls(html, response.url || baseUrl);
  const critical = urls.filter((url) => isCriticalBuildAsset(new URL(url).pathname));
  const optional = urls.filter((url) => !isCriticalBuildAsset(new URL(url).pathname));
  await Promise.all(critical.map((url) => cacheStaticAsset(url, required)));
  await Promise.allSettled(optional.map((url) => cacheStaticAsset(url, false)));
}

function validWorkspaceResponse(response, requestedPath) {
  if (!response.ok) return false;
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return false;
  const finalPath = new URL(response.url || new URL(requestedPath, self.location.origin).href).pathname;
  return isWorkspaceNavigation(finalPath) && finalPath !== "/login" && finalPath !== "/register";
}

async function precachePublicOffline() {
  const request = requestForPath("/offline");
  const response = await fetch(request);
  if (!validWorkspaceResponse(response, "/offline")) throw new Error("offline fallback is not cacheable HTML");
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(requestForPath("/offline"), response.clone());
  await cacheDocumentAssets(response, request.url, true);
}

async function precacheWorkspacePath(path, scope) {
  const normalized = safeScope(scope);
  if (!normalized) throw new Error("offline account scope is missing");
  const request = requestForPath(path, normalized);
  const response = await fetch(request);
  if (!validWorkspaceResponse(response, path)) throw new Error(`offline route ${path} is not cacheable workspace HTML`);
  const cache = await caches.open(workspaceCacheName(normalized));
  await cache.put(requestForPath(path), response.clone());
  await cacheDocumentAssets(response, request.url, true);
}

async function prepareAccountWorkspace(scope) {
  const normalized = safeScope(scope);
  if (!normalized) return false;
  const cacheName = workspaceCacheName(normalized);
  await caches.delete(cacheName);
  try {
    await Promise.all(WORKSPACE_ROUTES.map((path) => precacheWorkspacePath(path, normalized)));
    return true;
  } catch (error) {
    await caches.delete(cacheName);
    throw error;
  }
}

async function prepareOfflineRelease() {
  await caches.delete(RUNTIME_CACHE);
  try {
    await precachePublicOffline();
    await Promise.all(STATIC_SHELL_ASSETS.map((path) => cacheStaticAsset(new URL(path, self.location.origin).href, true)));
    const scope = await activeScope();
    if (scope) await prepareAccountWorkspace(scope);
  } catch (error) {
    await caches.delete(RUNTIME_CACHE);
    throw error;
  }
}

async function offlineWorkspaceReady(scope) {
  const normalized = safeScope(scope || await activeScope());
  if (!normalized) return false;
  const cache = await caches.open(workspaceCacheName(normalized));
  const rows = await Promise.all(WORKSPACE_ROUTES.map((path) => cache.match(requestForPath(path))));
  return rows.every(Boolean);
}

function legacyIncomeRedirect(request) {
  const url = new URL(request.url);
  const match = /^\/income\/(\d+)$/.exec(url.pathname);
  if (!match) return null;
  return Response.redirect(`${url.origin}/income?plan=${match[1]}`, 302);
}

async function offlineFallback() {
  const cache = await caches.open(RUNTIME_CACHE);
  return (await cache.match(requestForPath("/offline"))) || new Response("Offline", { status: 503 });
}

async function workspaceFallback(request, scope) {
  const normalized = safeScope(scope);
  if (normalized) {
    const cache = await caches.open(workspaceCacheName(normalized));
    const cached = await cache.match(cleanNavigationRequest(request));
    if (cached) return cached;
  }
  return offlineFallback();
}

async function networkFirstWorkspace(request) {
  const scope = await activeScope();
  try {
    const response = await fetch(request);
    if (response.ok) {
      if (scope && validWorkspaceResponse(response, new URL(request.url).pathname)) {
        const cache = await caches.open(workspaceCacheName(scope));
        await cache.put(cleanNavigationRequest(request), response.clone());
        await cacheDocumentAssets(response, request.url);
      }
      return response;
    }
    if (response.status < 500) return response;
    return workspaceFallback(request, scope);
  } catch {
    const redirect = legacyIncomeRedirect(request);
    if (redirect) return redirect;
    return workspaceFallback(request, scope);
  }
}

async function runtimeWorkspaceRequest(request) {
  const requestedScope = safeScope(request.headers.get("x-poolamkoo-scope") || "");
  if (requestedScope) await setActiveScope(requestedScope);
  const scope = requestedScope || await activeScope();
  try {
    const response = await fetch(request);
    if (response.ok && scope) {
      const cache = await caches.open(workspaceCacheName(scope));
      await cache.put(request, response.clone());
      if (request.headers.get("x-poolamkoo-warm") === "1" && validWorkspaceResponse(response, new URL(request.url).pathname)) {
        await cache.put(cleanNavigationRequest(request), response.clone());
        await cacheDocumentAssets(response, request.url);
      }
    }
    return response;
  } catch {
    if (scope) {
      const cache = await caches.open(workspaceCacheName(scope));
      const exact = await cache.match(request);
      if (exact) return exact;
    }
    if ((request.headers.get("accept") || "").includes("text/html")) return workspaceFallback(request, scope);
    return new Response("Offline", { status: 503 });
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request) || await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(prepareOfflineRelease());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data?.type === "SET_ACCOUNT_SCOPE") {
    event.waitUntil((async () => {
      const stored = await setActiveScope(event.data.scope);
      event.ports?.[0]?.postMessage({ release: OFFLINE_RELEASE, stored });
    })());
    return;
  }
  if (event.data?.type === "PREPARE_ACCOUNT_SCOPE") {
    event.waitUntil((async () => {
      try {
        const stored = await setActiveScope(event.data.scope);
        const ready = stored && await prepareAccountWorkspace(event.data.scope);
        event.ports?.[0]?.postMessage({ release: OFFLINE_RELEASE, ready });
      } catch {
        event.ports?.[0]?.postMessage({ release: OFFLINE_RELEASE, ready: false });
      }
    })());
    return;
  }
  if (event.data?.type === "GET_OFFLINE_STATUS") {
    event.waitUntil((async () => {
      const scope = safeScope(event.data.scope || "") || await activeScope();
      const ready = await offlineWorkspaceReady(scope);
      event.ports?.[0]?.postMessage({ release: OFFLINE_RELEASE, scope, ready });
    })());
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => {
      if (key === CACHE || key === RUNTIME_CACHE || key === SCOPE_CACHE) return false;
      if (key.startsWith(WORKSPACE_CACHE_PREFIX)) return false;
      return key.startsWith("poolamkoo-offline-");
    }).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    const accountEnding = url.origin === self.location.origin && (url.pathname === "/api/auth/logout" || url.pathname === "/api/auth/account");
    if (accountEnding) event.respondWith(fetch(request).then(async (response) => { if (response.status < 400) await clearActiveWorkspace(); return response; }));
    return;
  }

  if (url.origin === self.location.origin && isAppStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  if (url.pathname.startsWith("/api/market")) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      return cached || new Response(JSON.stringify({ mode: "offline", quotes: [] }), { status: 503, headers: { "Content-Type": "application/json; charset=utf-8" } });
    }));
    return;
  }

  if (request.mode === "navigate") {
    if (url.origin === self.location.origin && !isWorkspaceNavigation(url.pathname)) {
      event.respondWith(fetch(request));
      return;
    }
    if (url.pathname === "/offline") {
      event.respondWith(fetch(request).then(async (response) => {
        if (response.ok) (await caches.open(RUNTIME_CACHE)).put(requestForPath("/offline"), response.clone());
        return response;
      }).catch(() => offlineFallback()));
      return;
    }
    event.respondWith(networkFirstWorkspace(request));
    return;
  }

  if (url.origin === self.location.origin && isWorkspaceNavigation(url.pathname)) {
    event.respondWith(runtimeWorkspaceRequest(request));
    return;
  }

  event.respondWith(fetch(request).catch(async () => (await caches.match(request)) || new Response("Offline", { status: 503 })));
});

function markAlertTriggered(alertId, triggeredAt) {
  if (!Number.isInteger(alertId) || !triggeredAt) return Promise.resolve();
  return new Promise((resolve) => {
    const request = indexedDB.open("poolyar-local");
    request.onerror = () => resolve();
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("marketAlerts")) { database.close(); resolve(); return; }
      const tx = database.transaction("marketAlerts", "readwrite");
      const store = tx.objectStore("marketAlerts");
      const get = store.get(alertId);
      get.onsuccess = () => {
        const row = get.result;
        if (row) store.put({ ...row, armed: false, lastTriggeredAt: triggeredAt, updatedAt: triggeredAt });
      };
      tx.oncomplete = () => { database.close(); resolve(); };
      tx.onerror = () => { database.close(); resolve(); };
    };
  });
}

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = typeof data.title === "string" ? data.title : "هشدار بازار پولم‌کو";
  const options = {
    body: typeof data.body === "string" ? data.body : "شرط یکی از هشدارهای بازار برقرار شده است.",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    tag: data.tag || "poolamkoo-market-alert",
    data: { url: data.url || "/investments", alertId: data.alertId, triggeredAt: data.triggeredAt },
  };
  event.waitUntil(Promise.all([
    markAlertTriggered(Number(data.alertId), data.triggeredAt),
    self.registration.showNotification(title, options),
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/investments";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const target = new URL(targetUrl, self.location.origin);
    const existing = clients.find((client) => new URL(client.url).pathname === target.pathname);
    if (existing) {
      if ("navigate" in existing) existing.navigate(target.href).catch(() => undefined);
      return existing.focus();
    }
    return self.clients.openWindow(target.href);
  }));
});
