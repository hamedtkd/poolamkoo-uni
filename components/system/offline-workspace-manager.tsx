"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AccountUser } from "@/lib/server/account-types";

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

type OfflineStatus = { release?: string; ready?: boolean; scope?: string; stored?: boolean };

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

function messageWorker(worker: ServiceWorker | null, type: string, scope: string, timeoutMs = 1200) {
  if (!worker) return Promise.resolve<OfflineStatus | null>(null);
  return new Promise<OfflineStatus | null>((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    channel.port1.onmessage = (event: MessageEvent<OfflineStatus>) => {
      window.clearTimeout(timer);
      resolve(event.data ?? null);
    };
    worker.postMessage({ type, scope }, [channel.port2]);
  });
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
      await messageWorker(worker, "SET_ACCOUNT_SCOPE", account.id);
      if (cancelled || !navigator.onLine) return;

      for (const path of WORKSPACE_ROUTES) router.prefetch(path);
      const status = await messageWorker(worker, "GET_OFFLINE_STATUS", account.id);
      if (cancelled || status?.ready) {
        if (registration.waiting) void messageWorker(registration.waiting, "PREPARE_ACCOUNT_SCOPE", account.id, 30_000);
        return;
      }

      await Promise.allSettled(WORKSPACE_ROUTES.map(async (path) => {
        const response = await fetch(path, {
          credentials: "include",
          headers: { "x-poolamkoo-warm": "1", "x-poolamkoo-scope": account.id, accept: "text/html" },
        });
        if (!response.ok) throw new Error(`warm ${path} failed`);
        await response.text();
      }));
      if (registration.waiting) void messageWorker(registration.waiting, "PREPARE_ACCOUNT_SCOPE", account.id, 30_000);
    }

    const onOnline = () => void syncOfflineShell();
    const onControllerChange = () => void syncOfflineShell();
    void syncOfflineShell();
    window.addEventListener("online", onOnline);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [account.id, router]);

  useEffect(() => {
    let offline = !navigator.onLine;
    const markOffline = () => { offline = true; document.documentElement.dataset.poolamkooNetwork = "offline"; };
    const markOnline = () => { offline = false; document.documentElement.dataset.poolamkooNetwork = "online"; };
    if (offline) markOffline(); else markOnline();

    function onClick(event: MouseEvent) {
      if (!scopeMatches(account.id) || !offline || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const rawTarget = event.target;
      const target = rawTarget instanceof Element ? rawTarget : rawTarget instanceof Node ? rawTarget.parentElement : null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !isWorkspacePath(url.pathname)) return;
      event.preventDefault();
      window.location.href = url.href;
    }

    window.addEventListener("offline", markOffline);
    window.addEventListener("online", markOnline);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", markOnline);
      document.removeEventListener("click", onClick, true);
      delete document.documentElement.dataset.poolamkooNetwork;
    };
  }, [account.id]);

  return null;
}
