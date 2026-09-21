import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("offline workspace verifies and repairs the active account cache", () => {
  const manager = read("components/system/offline-workspace-manager.tsx");
  const routeLayout = read("components/app/app-route-layout.tsx");
  for (const route of ["/dashboard", "/income", "/funds", "/investments", "/reports", "/account"]) {
    assert.equal(manager.includes(`"${route}"`), true);
  }
  assert.equal(manager.includes('poolamkoo_scope='), true);
  assert.equal(manager.includes('scopeMatches(account.id)'), true);
  assert.equal(manager.includes('"GET_OFFLINE_STATUS"'), true);
  assert.equal(manager.includes('"PREPARE_ACCOUNT_SCOPE"'), true);
  assert.equal(manager.includes('"x-poolamkoo-scope": account.id'), true);
  assert.equal(manager.includes('navigator.serviceWorker.addEventListener("controllerchange"'), true);
  assert.equal(manager.includes("sessionStorage"), false);
  assert.equal(routeLayout.includes("<OfflineWorkspaceManager account={account} />"), true);
});

test("offline navigation uses cached documents instead of Next route-data requests", () => {
  const manager = read("components/system/offline-workspace-manager.tsx");
  const helper = read("lib/workspace-navigation.ts");
  const screen = read("components/system/offline-screen.tsx");
  assert.equal(manager.includes("window.location.href = url.href"), true);
  assert.equal(manager.includes('dataset.poolamkooNetwork = "offline"'), true);
  assert.equal(helper.includes('dataset.poolamkooNetwork === "offline"'), true);
  assert.equal(helper.includes("window.location.href = target.href"), true);
  assert.equal(screen.includes("window.location.href = new URL(APP_ENTRY_PATH"), true);
});

test("service worker prepares a complete account-scoped release safely", () => {
  const serviceWorker = read("public/sw.js");
  assert.equal(/const OFFLINE_RELEASE = "v[0-9]+";/.test(serviceWorker), true);
  assert.equal(serviceWorker.includes('const SCOPE_CACHE = "poolamkoo-offline-scope"'), true);
  assert.equal(serviceWorker.includes("workspaceCacheName(scope)"), true);
  assert.equal(serviceWorker.includes("prepareOfflineRelease"), true);
  assert.equal(serviceWorker.includes("prepareAccountWorkspace"), true);
  assert.equal(serviceWorker.includes("Promise.all(WORKSPACE_ROUTES.map((path) => precacheWorkspacePath(path, normalized)))"), true);
  assert.equal(serviceWorker.includes("await cacheDocumentAssets(response, request.url, true)"), true);
  assert.equal(serviceWorker.includes('event.waitUntil(prepareOfflineRelease())'), true);
  assert.equal(serviceWorker.includes('"SET_ACCOUNT_SCOPE"'), true);
  assert.equal(serviceWorker.includes('"PREPARE_ACCOUNT_SCOPE"'), true);
  assert.equal(serviceWorker.includes('"GET_OFFLINE_STATUS"'), true);
  assert.equal(serviceWorker.includes('"/account"'), true);
  assert.equal(serviceWorker.includes('decodeURIComponent(value)'), true);
  assert.equal(serviceWorker.includes('decoded.startsWith("#")'), true);
  assert.equal(serviceWorker.includes("readLegacyScope"), true);
  assert.equal(serviceWorker.includes("clearActiveWorkspace"), true);
  assert.equal(serviceWorker.includes('url.pathname === "/api/auth/logout"'), true);
});

test("offline market mode stops new network price requests and keeps cached quotes", () => {
  const hook = read("hooks/use-market.ts");
  assert.equal(hook.includes("useNetworkStatus"), true);
  assert.equal(hook.includes("if (!online)"), true);
  assert.equal(hook.includes("latestCachedQuotes()"), true);
  assert.equal(hook.includes("قیمت تازه دریافت نمی‌شود"), true);
});

test("every income-plan entry point uses the cached income route", () => {
  const list = read("components/sections/income.tsx");
  const page = read("app/(workspace)/income/page.tsx");
  const newMoney = read("components/new-money-dialog.tsx");
  const activity = read("lib/activity.ts");
  assert.equal(list.includes("/income?plan="), true);
  assert.equal(page.includes('searchParams.get("plan")'), true);
  assert.equal(page.includes("<IncomePlanPage"), true);
  assert.equal(newMoney.includes("/income?plan=${incomeId}"), true);
  assert.equal(newMoney.includes("/income/${incomeId}"), false);
  assert.equal(activity.includes("/income?plan=${income.id}"), true);
  assert.equal(activity.includes("/income/${income.id}"), false);
});

test("legacy dynamic income URLs redirect to the cached query route when offline", () => {
  const serviceWorker = read("public/sw.js");
  assert.equal(serviceWorker.includes("legacyIncomeRedirect"), true);
  assert.equal(serviceWorker.includes("/income?plan=${match[1]}"), true);
});
