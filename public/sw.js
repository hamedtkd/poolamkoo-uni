const CACHE = "poolamkoo-v71";
const RUNTIME_CACHE = "poolamkoo-offline-v81";
const PRECACHE = ["/dashboard", "/offline", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/maskable-512.png", "/logo-poolamkoo.svg"];
const WORKSPACE_NAVIGATION_PREFIXES = ["/dashboard", "/activity", "/income", "/funds", "/investments", "/reports", "/settings", "/account"];
const SCOPE_MARKER = "/__poolamkoo_active_scope__";
let memoryScope = null;

function isWorkspaceNavigation(pathname) {
  return pathname === "/offline" || WORKSPACE_NAVIGATION_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function safeScope(scope) {
  return typeof scope === "string" ? scope.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : "";
}

async function setActiveScope(scope) {
  const next = safeScope(scope);
  if (!next) return;
  memoryScope = next;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(SCOPE_MARKER, new Response(next, { headers: { "Content-Type": "text/plain" } }));
}

async function activeScope() {
  if (memoryScope) return memoryScope;
  const cache = await caches.open(RUNTIME_CACHE);
  const response = await cache.match(SCOPE_MARKER);
  const stored = safeScope(response ? await response.text() : "");
  memoryScope = stored || null;
  return memoryScope;
}

async function workspaceCache() {
  const scope = await activeScope();
  return caches.open(`${RUNTIME_CACHE}-workspace-${scope || "anonymous"}`);
}

async function clearActiveWorkspace() {
  const scope = await activeScope();
  if (scope) await caches.delete(`${RUNTIME_CACHE}-workspace-${scope}`);
  memoryScope = null;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.delete(SCOPE_MARKER);
}

function cleanNavigationRequest(request) {
  const url = new URL(request.url);
  return new Request(`${url.origin}${url.pathname}`, { method: "GET", headers: { accept: "text/html" }, credentials: "include" });
}

async function networkFirstWorkspace(request) {
  const cache = await workspaceCache();
  const key = cleanNavigationRequest(request);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(key, response.clone());
    return response;
  } catch {
    return (await cache.match(key)) || (await caches.match("/offline"));
  }
}

async function runtimeWorkspaceRequest(request) {
  const requestedScope = request.headers.get("x-poolamkoo-scope");
  if (requestedScope) await setActiveScope(requestedScope);
  const cache = await workspaceCache();
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      if (request.headers.get("x-poolamkoo-warm") === "1") {
        await cache.put(cleanNavigationRequest(request), response.clone());
      }
    }
    return response;
  } catch {
    return (await cache.match(request)) || new Response("Offline", { status: 503 });
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.allSettled(PRECACHE.map((path) => cache.add(path)))));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
  if (event.data?.type === "SET_ACCOUNT_SCOPE") event.waitUntil(setActiveScope(event.data.scope));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== RUNTIME_CACHE && !key.startsWith(`${RUNTIME_CACHE}-workspace-`)).map((key) => caches.delete(key)))),
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

  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
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
