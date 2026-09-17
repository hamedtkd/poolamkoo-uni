import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("offline workspace warms every primary local-first page for the active account", () => {
  const manager = read("components/system/offline-workspace-manager.tsx");
  const routeLayout = read("components/app/app-route-layout.tsx");
  assert.equal(manager.includes('"/dashboard"'), true);
  assert.equal(manager.includes('"/income"'), true);
  assert.equal(manager.includes('"/funds"'), true);
  assert.equal(manager.includes('"/investments"'), true);
  assert.equal(manager.includes('"/reports"'), true);
  assert.equal(manager.includes('"x-poolamkoo-scope": account.id'), true);
  assert.equal(manager.includes('poolamkoo_scope='), true);
  assert.equal(manager.includes('scopeMatches(account.id)'), true);
  assert.equal(routeLayout.includes("<OfflineWorkspaceManager account={account} />"), true);
  assert.equal(manager.includes("window.location.assign"), false);
  assert.equal(manager.includes("router.push"), true);
});

test("service worker isolates cached workspace pages by account and clears them on account exit", () => {
  const serviceWorker = read("public/sw.js");
  assert.equal(serviceWorker.includes("poolamkoo-offline-v81"), true);
  assert.equal(serviceWorker.includes("workspace-${scope"), true);
  assert.equal(serviceWorker.includes("SET_ACCOUNT_SCOPE"), true);
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

test("income plan links use the cached income route so detailed plans remain offline-safe", () => {
  const list = read("components/sections/income.tsx");
  const page = read("app/(workspace)/income/page.tsx");
  assert.equal(list.includes("/income?plan="), true);
  assert.equal(page.includes('searchParams.get("plan")'), true);
  assert.equal(page.includes("<IncomePlanPage"), true);
});
