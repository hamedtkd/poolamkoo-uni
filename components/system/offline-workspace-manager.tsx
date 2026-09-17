"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AccountUser } from "@/lib/server/account-types";

const OFFLINE_WARM_VERSION = "v3";
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
] as const;

function isWorkspacePath(pathname: string) {
  return WORKSPACE_ROUTES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function currentLocalScope() {
  const entry = document.cookie.split("; ").find((part) => part.startsWith("poolamkoo_scope="));
  return entry ? decodeURIComponent(entry.slice("poolamkoo_scope=".length)) : "";
}

function scopeMatches(accountId: string) {
  return currentLocalScope() === accountId;
}

export function OfflineWorkspaceManager({ account }: { account: AccountUser }) {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;

    async function syncOfflineShell() {
      if (!scopeMatches(account.id)) return;
      const registration = await navigator.serviceWorker.ready;
      if (cancelled) return;
      const worker = navigator.serviceWorker.controller ?? registration.active;
      worker?.postMessage({ type: "SET_ACCOUNT_SCOPE", scope: account.id });
      if (!navigator.onLine) return;

      for (const path of WORKSPACE_ROUTES) router.prefetch(path);
      const marker = `poolamkoo:offline-warm:${OFFLINE_WARM_VERSION}:${account.id}`;
      if (sessionStorage.getItem(marker) === "1") return;
      const results = await Promise.allSettled(WORKSPACE_ROUTES.map(async (path) => {
        const response = await fetch(path, { credentials: "include", headers: { "x-poolamkoo-warm": "1", "x-poolamkoo-scope": account.id, accept: "text/html" } });
        if (!response.ok) throw new Error(`warm ${path} failed`);
        await response.text();
      }));
      if (!cancelled && results.some((result) => result.status === "fulfilled")) sessionStorage.setItem(marker, "1");
    }

    const onOnline = () => void syncOfflineShell();
    void syncOfflineShell();
    window.addEventListener("online", onOnline);
    return () => { cancelled = true; window.removeEventListener("online", onOnline); };
  }, [account.id, router]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!scopeMatches(account.id) || navigator.onLine || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const rawTarget = event.target;
      const target = rawTarget instanceof Element ? rawTarget : rawTarget instanceof Node ? rawTarget.parentElement : null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !isWorkspacePath(url.pathname)) return;
      event.preventDefault();
      router.push(`${url.pathname}${url.search}${url.hash}`);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [account.id, router]);

  return null;
}
